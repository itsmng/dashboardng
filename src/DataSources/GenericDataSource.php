<?php

namespace GlpiPlugin\Dashboardng\DataSources;

use CommonDBTM;
use Search;
use Session;
use GlpiPlugin\Dashboardng\Registry\ItemtypeRegistry;
use GlpiPlugin\Dashboardng\Cache\QueryCacheManager;

/**
 * Generic Data Source for querying any GLPI itemtype
 * Leverages GLPI's Search engine with entity permissions
 */
class GenericDataSource
{

    /** @var int Default row limit */
    private int $defaultLimit = 1000;

    /** @var int Maximum row limit */
    private int $maxLimit = 10000;

    /** @var int Query timeout in seconds */
    private int $timeout = 30;

    private FilterBuilder $filterBuilder;
    private JoinBuilder $joinBuilder;
    private FieldResolver $fieldResolver;
    private DateGapFiller $dateGapFiller;
    private QueryCacheManager $cacheManager;
    private int $cacheTTL;
    private bool $cacheEnabled;

    /**
     * Constructor with configurable limits
     */
    public function __construct(?array $config = null)
    {
        if ($config) {
            $this->defaultLimit = $config['default_limit'] ?? $this->defaultLimit;
            $this->maxLimit = $config['max_limit'] ?? $this->maxLimit;
            $this->timeout = $config['timeout'] ?? $this->timeout;
            $this->cacheEnabled = $config['cache_enabled'] ?? true;
            $this->cacheTTL = $config['cache_ttl'] ?? QueryCacheManager::TTL_DEFAULT;
        } else {
            $this->cacheEnabled = true;
            $this->cacheTTL = QueryCacheManager::TTL_DEFAULT;
        }

        $this->filterBuilder = new FilterBuilder();
        $this->joinBuilder = new JoinBuilder();
        $this->fieldResolver = new FieldResolver();
        $this->dateGapFiller = new DateGapFiller();
        $this->cacheManager = new QueryCacheManager([
            'cache_enabled' => $this->cacheEnabled,
        ]);
    }

    /**
     * Get list of available itemtypes with metadata
     *
     * @return array
     */
    public function getAvailableItemtypes(): array
    {
        return ItemtypeRegistry::getAvailableItemtypes();
    }

    /**
     * Get searchable fields for an itemtype
     *
     * @param string $itemtype
     * @return array
     */
    public function getSearchableFields(string $itemtype): array
    {
        if (!$this->isItemtypeAllowed($itemtype)) {
            return [];
        }

        if (!class_exists($itemtype)) {
            return [];
        }

        $searchOptions = Search::getOptions($itemtype);
        $fields = [];

        foreach ($searchOptions as $id => $option) {
            // Skip non-searchable options
            if (!is_array($option) || !isset($option['name'])) {
                continue;
            }

            // Skip internal/technical fields
            if (isset($option['nosearch']) && $option['nosearch']) {
                continue;
            }

            $fields[] = [
                'id' => $id,
                'name' => $option['name'],
                'field' => $option['field'] ?? null,
                'table' => $option['table'] ?? null,
                'datatype' => $option['datatype'] ?? 'text',
                'linkfield' => $option['linkfield'] ?? null,
                'searchtype' => $this->getSearchTypes($option['datatype'] ?? 'text'),
                'aggregatable' => $this->isAggregatable($option['datatype'] ?? 'text'),
                'groupable' => $this->isGroupable($option),
            ];
        }

        return $fields;
    }

    /**
     * Execute a dynamic query
     *
     * @param array $queryConfig Query configuration
     * @return array
     */
    public function executeQuery(array $queryConfig): array
    {
        $itemtype = $queryConfig['itemtype'] ?? null;
        $filters = $queryConfig['filters'] ?? [];
        $groupBy = $queryConfig['group_by'] ?? null;
        $aggregation = $queryConfig['aggregation'] ?? null;
        $orderBy = $queryConfig['order_by'] ?? null;
        $limit = min($queryConfig['limit'] ?? $this->defaultLimit, $this->maxLimit);
        $outputFields = $queryConfig['output_fields'] ?? [];
        $dateRange = $queryConfig['date_range'] ?? null;
        $series = $queryConfig['series'] ?? null;
        $nocache = $queryConfig['nocache'] ?? false;

        if (!$this->isItemtypeAllowed($itemtype)) {
            return [
                'success' => false,
                'error' => 'Itemtype not allowed: ' . $itemtype,
            ];
        }

        if (!class_exists($itemtype)) {
            return [
                'success' => false,
                'error' => 'Itemtype does not exist: ' . $itemtype,
            ];
        }

        try {
            $cacheKey = null;
            $fromCache = false;

            if (!$nocache && $this->cacheManager->isEnabled()) {
                $cacheKey = $this->cacheManager->getQueryCacheKey($queryConfig);
                $cached = $this->cacheManager->get($cacheKey);

                if ($cached !== null) {
                    return array_merge($cached, ['from_cache' => true]);
                }
            }

            $result = null;

            if ($series && $aggregation && $groupBy) {
                $data = $this->executeMultiSeriesQuery(
                    $itemtype,
                    $series,
                    $groupBy,
                    $aggregation,
                    $filters,
                    $orderBy,
                    $limit,
                    $dateRange
                );
                $result = [
                    'success' => true,
                    'data' => $data,
                    'meta' => [
                        'itemtype' => $itemtype,
                        'is_multi_series' => true,
                    ],
                    'timestamp' => time(),
                ];
            } else {
                if ($aggregation && $groupBy) {
                    $data = $this->executeAggregatedQuery($itemtype, $filters, $groupBy, $aggregation, $orderBy, $limit, $dateRange);
                } else {
                    $data = $this->executeListQuery($itemtype, $filters, $outputFields, $orderBy, $limit);
                }

                $result = [
                    'success' => true,
                    'data' => $data['rows'],
                    'total' => $data['total'],
                    'columns' => $data['columns'] ?? [],
                    'meta' => [
                        'itemtype' => $itemtype,
                        'limit' => $limit,
                        'has_more' => $data['total'] > count($data['rows']),
                    ],
                    'timestamp' => time(),
                ];
            }

            if ($result['success'] && $cacheKey !== null && $this->cacheManager->isEnabled()) {
                $ttl = $aggregation ? QueryCacheManager::TTL_LONG : $this->cacheTTL;
                $this->cacheManager->set($cacheKey, $result, $ttl);
            }

            return array_merge($result, ['from_cache' => false]);
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'timestamp' => time(),
            ];
        }
    }

    /**
     * Execute aggregated query (COUNT, SUM, AVG, etc.)
     */
    private function executeAggregatedQuery(
        string $itemtype,
        array $filters,
        array $groupBy,
        array $aggregation,
        ?array $orderBy,
        int $limit,
        ?array $dateRange = null
    ): array {
        global $DB;

        /** @var CommonDBTM $item */
        $item = new $itemtype();
        $table = $item->getTable();
        $searchOptions = Search::getOptions($itemtype);

        // Build GROUP BY clause
        $groupByFields = [];
        $selectFields = [];

        // Track date interval info for gap filling
        $dateIntervalConfig = null;

        // Normalize group_by array - extract field ID and interval from objects if present
        $normalizedGroupBy = [];
        $calculatedFieldIndex = 0;
        foreach ($groupBy as $groupItem) {
            if (is_array($groupItem) && isset($groupItem['type']) && $groupItem['type'] === 'calculated') {
                // Handle calculated SQL expression
                $expression = $groupItem['expression'] ?? null;
                if ($expression) {
                    $alias = 'calculated_' . $calculatedFieldIndex++;
                    $normalizedGroupBy[] = [
                        'type' => 'calculated',
                        'expression' => $expression,
                        'alias' => $alias,
                    ];
                    $groupByFields[] = "($expression) AS `$alias`";
                    $selectFields[] = "($expression) AS `$alias`";
                }
            } elseif (is_array($groupItem) && isset($groupItem['field'])) {
                $fieldId = $groupItem['field'];
                $interval = $groupItem['interval'] ?? null;
                $normalizedGroupBy[] = $fieldId;

                // Track interval config for date fields
                if ($interval) {
                    $dateIntervalConfig = [
                        'field' => $fieldId,
                        'interval' => $interval,
                    ];
                }
            } else {
                $normalizedGroupBy[] = $groupItem;
            }
        }

        // Process regular field-based group bys
        foreach ($normalizedGroupBy as $groupByItem) {
            if (is_array($groupByItem) && isset($groupByItem['type']) && $groupByItem['type'] === 'calculated') {
                // Already processed above, skip
                continue;
            }

            $fieldId = $groupByItem;
            $opt = $searchOptions[$fieldId] ?? null;
            if (!$opt || !isset($opt['field'])) {
                continue;
            }

            $fieldTable = $opt['table'] ?? $table;
            $fieldName = $opt['field'];
            $alias = 'group_' . $fieldId;
            $datatype = $opt['datatype'] ?? 'text';

            $fullField = $fieldTable === $table
                ? "`$table`.`$fieldName`"
                : "`$fieldTable`.`$fieldName`";

            // Apply date truncation if this is a date field with an interval
            if (
                $dateIntervalConfig && $dateIntervalConfig['field'] == $fieldId &&
                in_array($datatype, ['datetime', 'date', 'timestamp'])
            ) {

                $interval = $dateIntervalConfig['interval'];
                $truncatedField = SqlHelper::getDateTruncationSQL($fullField, $interval);
                $groupByFields[] = $truncatedField;
                $selectFields[] = "$truncatedField AS `$alias`";
            } else {
                $groupByFields[] = $fullField;
                $selectFields[] = "$fullField AS `$alias`";
            }
        }

        // Build aggregation
        $aggFunc = strtoupper($aggregation['function'] ?? 'COUNT');
        $aggField = $aggregation['field'] ?? null;

        if ($aggFunc === 'COUNT') {
            $selectFields[] = "COUNT(*) AS `value`";
        } else {
            $aggOpt = $searchOptions[$aggField] ?? null;
            if ($aggOpt && isset($aggOpt['field'])) {
                $aggTable = $aggOpt['table'] ?? $table;
                $aggColumn = $aggOpt['field'];
                $selectFields[] = "$aggFunc(`$aggTable`.`$aggColumn`) AS `value`";
            } else {
                $selectFields[] = "COUNT(*) AS `value`";
            }
        }

        // Build WHERE clause from filters
        $where = $this->filterBuilder->buildWhereClause($itemtype, $filters, $searchOptions, $table);

        // Add entity restriction
        $entityWhere = $this->getEntityRestriction($itemtype, $table);
        if ($entityWhere) {
            $where[] = $entityWhere;
        }

        // Build joins for related tables used by grouping, aggregation, and filters
        $joinFields = array_merge(
            $normalizedGroupBy,
            [$aggField],
            array_column($filters, 'field')
        );
        $joins = $this->joinBuilder->buildJoins($itemtype, $joinFields, $searchOptions, $table);

        // Build query
        $sql = "SELECT " . implode(", ", $selectFields) . " FROM `$table`";

        if (!empty($joins)) {
            $sql .= " " . implode(" ", $joins);
        }

        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }

        if (!empty($groupByFields)) {
            $sql .= " GROUP BY " . implode(", ", $groupByFields);
        }

        // For date-grouped queries, sort chronologically; otherwise by value descending
        if ($dateIntervalConfig && $dateRange) {
            $alias = 'group_' . $dateIntervalConfig['field'];
            $sql .= " ORDER BY `$alias` ASC";
        } else {
            $sql .= " ORDER BY `value` DESC";
        }

        $sql .= " LIMIT $limit";

        $result = $DB->query($sql);
        if (!$result) {
            throw new \RuntimeException($DB->error() ?: 'Failed to execute aggregated query');
        }

        $rows = [];

        while ($row = $DB->fetchAssoc($result)) {
            $rows[] = $row;
        }

        // Fill date gaps if we have date interval config and a date range
        if ($dateIntervalConfig && $dateRange) {
            $rows = $this->dateGapFiller->fillDateGaps($rows, $dateRange, $dateIntervalConfig);
        }

        // Resolve enum/dropdown values to display labels
        $rows = $this->fieldResolver->resolveDisplayLabels($rows, $normalizedGroupBy, $searchOptions, $itemtype);

        return [
            'rows' => $rows,
            'total' => count($rows),
            'columns' => array_merge(
                array_map(fn($id) => ['id' => $id, 'name' => $searchOptions[$id]['name'] ?? "Field $id"], $normalizedGroupBy),
                [['id' => 'value', 'name' => ucfirst($aggFunc)]]
            ),
        ];
    }

    /**
     * Execute multi-series query for comparison charts
     * Executes separate queries for each series and combines results
     *
     * @param string $itemtype
     * @param array $seriesConfigs Array of series configs with name, filters, filter_mode
     * @param array $groupBy Grouping configuration (field + interval)
     * @param array $aggregation Aggregation function
     * @param array $baseFilters Base filters applied to all series
     * @param array|null $orderBy Sorting configuration
     * @param int $limit Row limit
     * @param array|null $dateRange Date range for gap filling
     * @return array Multi-series data structure
     */
    private function executeMultiSeriesQuery(
        string $itemtype,
        array $seriesConfigs,
        array $groupBy,
        array $aggregation,
        array $baseFilters,
        ?array $orderBy,
        int $limit,
        ?array $dateRange
    ): array {
        $result = ['series' => []];
        $groupByField = $this->getGroupByField($groupBy);

        foreach ($seriesConfigs as $index => $series) {
            $seriesName = $series['name'] ?? 'Series ' . ($index + 1);
            $seriesFilters = $series['filters'] ?? [];

            $filterMode = $series['filter_mode'] ?? 'append';
            $filters = $filterMode === 'replace'
                ? $seriesFilters
                : array_merge($baseFilters, $seriesFilters);

            $seriesDateRange = $this->extractDateRangeFromFilters($filters, $groupBy) ?? $dateRange;

            $data = $this->executeAggregatedQuery(
                $itemtype,
                $filters,
                $groupBy,
                $aggregation,
                $orderBy,
                $limit,
                $seriesDateRange
            );

            $seriesData = [];
            $groupAlias = null;

            foreach ($data['rows'] as $row) {
                if (empty($groupAlias)) {
                    foreach (array_keys($row) as $key) {
                        if (str_starts_with($key, 'group_') || str_starts_with($key, 'calculated_')) {
                            $groupAlias = $key;
                            break;
                        }
                    }
                }

                if ($groupAlias && isset($row[$groupAlias]) && isset($row['value'])) {
                    $seriesData[] = [(string) $row[$groupAlias], $row['value']];
                }
            }

            $result['series'][] = [
                'name' => $seriesName,
                'data' => $seriesData,
                'color' => $series['color'] ?? null,
            ];
        }

        return $result;
    }

    private function getGroupByField(array $groupBy): ?int
    {
        foreach ($groupBy as $groupItem) {
            if (is_array($groupItem) && isset($groupItem['field'])) {
                return (int) $groupItem['field'];
            }

            if (is_numeric($groupItem)) {
                return (int) $groupItem;
            }
        }

        return null;
    }

    private function getGroupByInterval(array $groupBy): ?string
    {
        foreach ($groupBy as $groupItem) {
            if (is_array($groupItem) && isset($groupItem['field'])) {
                return $groupItem['interval'] ?? null;
            }
        }

        return null;
    }

    private function extractDateRangeFromFilters(array $filters, array $groupBy): ?array
    {
        $groupField = $this->getGroupByField($groupBy);
        $interval = $this->getGroupByInterval($groupBy);

        if (!$groupField || !$interval) {
            return null;
        }

        $startDate = null;
        $endDate = null;

        foreach ($filters as $filter) {
            $fieldId = $filter['field'] ?? null;
            if (!$fieldId || (int) $fieldId !== $groupField) {
                continue;
            }

            $operator = $this->normalizeFilterOperator($filter['operator'] ?? null, $filter['searchtype'] ?? null);
            $value = $filter['value'] ?? null;

            if (!$value) {
                continue;
            }

            if ($operator === 'between' && is_array($value) && count($value) >= 2) {
                $startDate = $this->normalizeDateValue($value[0]);
                $endDate = $this->normalizeDateValue($value[1]);
                continue;
            }

            $normalizedValue = is_array($value) ? reset($value) : $value;
            $dateValue = $this->normalizeDateValue($normalizedValue);

            if (in_array($operator, ['greater_than', 'greater_or_equal'], true)) {
                if (!$startDate || $dateValue > $startDate) {
                    $startDate = $dateValue;
                }
            } elseif (in_array($operator, ['less_than', 'less_or_equal'], true)) {
                if (!$endDate || $dateValue < $endDate) {
                    $endDate = $dateValue;
                }
            } elseif ($operator === 'equals') {
                $startDate = $dateValue;
                $endDate = $dateValue;
            }
        }

        if ($startDate && !$endDate) {
            $endDate = date('Y-m-d');
        }

        if ($startDate && $endDate) {
            return [
                'start' => $startDate,
                'end' => $endDate,
                'interval' => $interval,
                'field' => $groupField,
            ];
        }

        return null;
    }

    private function normalizeFilterOperator(?string $operator, ?string $searchType): string
    {
        if ($operator) {
            return $operator;
        }

        return match ($searchType) {
            'equals' => 'equals',
            'notequals' => 'not_equals',
            'contains' => 'contains',
            'notcontains' => 'not_contains',
            'morethan' => 'greater_or_equal',
            'lessthan' => 'less_than',
            'between' => 'between',
            'isnull' => 'is_null',
            'isnotnull' => 'is_not_null',
            default => 'equals',
        };
    }

    private function normalizeDateValue($value): string
    {
        if (is_string($value)) {
            return explode(' ', $value)[0];
        }

        return (string) $value;
    }

    /**
     * Execute list query (raw data)
     */
    private function executeListQuery(
        string $itemtype,
        array $filters,
        array $outputFields,
        ?array $orderBy,
        int $limit
    ): array {
        // Use GLPI Search for list queries (handles permissions, joins, etc.)
        $params = [
            'criteria' => $this->convertFiltersToSearchCriteria($filters),
            'metacriteria' => [],
            'itemtype' => $itemtype,
            'start' => 0,
            'sort' => $orderBy['field'] ?? 1,
            'order' => $orderBy['direction'] ?? 'DESC',
            'reset' => 'reset',
            'is_deleted' => 0,
        ];

        // If specific fields requested, add them to display
        if (!empty($outputFields)) {
            $params['display_type'] = 'csv';
            // Only include valid field IDs
            $params['toview'] = array_filter($outputFields, fn($f) => is_numeric($f));
        }

        // Execute search
        $searchData = Search::getDatas($itemtype, $params);

        $rows = [];
        $columns = [];

        if (isset($searchData['data']['rows'])) {
            foreach ($searchData['data']['rows'] as $row) {
                $cleanRow = [];
                foreach ($row as $key => $value) {
                    if (is_array($value)) {
                        $cleanRow[$key] = $value['displayname'] ?? $value['name'] ?? reset($value);
                    } else {
                        $cleanRow[$key] = $value;
                    }
                }
                $rows[] = $cleanRow;

                if (count($rows) >= $limit) {
                    break;
                }
            }
        }

        // Extract columns from search options
        if (isset($searchData['data']['cols'])) {
            foreach ($searchData['data']['cols'] as $col) {
                $colId = $col['id'] ?? '';
                // If outputFields specified, only include those columns
                if (!empty($outputFields)) {
                    if (!in_array($colId, $outputFields)) {
                        continue;
                    }
                }
                $columns[] = [
                    'id' => $colId,
                    'name' => $col['name'] ?? '',
                ];
            }
        }

        return [
            'rows' => $rows,
            'total' => $searchData['data']['totalcount'] ?? count($rows),
            'columns' => $columns,
        ];
    }

    /**
     * Get entity restriction SQL
     */
    private function getEntityRestriction(string $itemtype, string $table): ?string
    {
        if (!class_exists($itemtype)) {
            return null;
        }

        /** @var CommonDBTM $item */
        $item = new $itemtype();

        if (!$item->isEntityAssign()) {
            return null;
        }

        $entities = $_SESSION['glpiactiveentities'] ?? [];
        if (empty($entities)) {
            return null;
        }

        $entityField = $item->isField('entities_id') ? 'entities_id' : null;
        if (!$entityField) {
            return null;
        }

        return "`$table`.`$entityField` IN (" . implode(',', array_map('intval', $entities)) . ")";
    }

    /**
     * Convert widget filters to Search criteria format
     */
    private function convertFiltersToSearchCriteria(array $filters): array
    {
        $criteria = [];

        foreach ($filters as $filter) {
            $searchtype = $filter['searchtype'] ?? null;
            if ($searchtype === null) {
                $searchtype = $this->convertOperatorToSearchType($filter['operator'] ?? 'contains');
            }

            $criterion = [
                'field' => $filter['field'] ?? 1,
                'searchtype' => $searchtype,
                'value' => $filter['value'] ?? '',
            ];

            if (isset($filter['link'])) {
                $criterion['link'] = $filter['link'];
            }

            $criteria[] = $criterion;
        }

        return $criteria;
    }

    /**
     * Convert operator to GLPI search type
     */
    private function convertOperatorToSearchType(string $operator): string
    {
        return match ($operator) {
            'equals' => 'equals',
            'not_equals' => 'notequals',
            'contains' => 'contains',
            'not_contains' => 'notcontains',
            'greater_than', 'greater_or_equal' => 'morethan',
            'less_than', 'less_or_equal' => 'lessthan',
            'is_null' => 'empty',
            'is_not_null' => 'empty', // Will be negated
            default => 'contains',
        };
    }

    /**
     * Check if itemtype is allowed
     */
    private function isItemtypeAllowed(string $itemtype): bool
    {
        return ItemtypeRegistry::isItemtypeAllowed($itemtype);
    }

    /**
     * Get available search types for a datatype
     */
    private function getSearchTypes(string $datatype): array
    {
        $types = ['equals', 'not_equals', 'contains', 'not_contains'];

        if (in_array($datatype, ['number', 'integer', 'decimal', 'timestamp', 'datetime', 'date'])) {
            $types = array_merge($types, ['greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'between']);
        }

        $types[] = 'is_null';
        $types[] = 'is_not_null';

        return $types;
    }

    /**
     * Check if field can be aggregated
     */
    private function isAggregatable(string $datatype): bool
    {
        return in_array($datatype, ['number', 'integer', 'decimal', 'count', 'actiontime']);
    }

    /**
     * Check if field can be grouped
     */
    private function isGroupable(array $option): bool
    {
        $datatype = $option['datatype'] ?? 'text';
        return !in_array($datatype, ['text', 'longtext']);
    }

    /**
     * Get current limits
     */
    public function getLimits(): array
    {
        return [
            'default_limit' => $this->defaultLimit,
            'max_limit' => $this->maxLimit,
            'timeout' => $this->timeout,
        ];
    }

    /**
     * Get the cache manager instance
     *
     * @return QueryCacheManager
     */
    public function getCacheManager(): QueryCacheManager
    {
        return $this->cacheManager;
    }

    /**
     * Clear all cached queries for this datasource
     *
     * @return void
     */
    public function clearCache(): void
    {
        $this->cacheManager->clearPluginCache();
    }

    /**
     * Clear cached queries for a specific itemtype
     *
     * @param string $itemtype Item type
     * @return void
     */
    public function clearItemtypeCache(string $itemtype): void
    {
        $this->cacheManager->invalidateItemtype($itemtype);
    }
}
