<?php

namespace GlpiPlugin\Dashboardng\DataSources;

use CommonDBTM;
use SavedSearch;
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
    private const SAVED_SEARCH_PREFIX = 'savedsearch:';

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
        return array_merge(
            ItemtypeRegistry::getAvailableItemtypes(),
            $this->getAvailableSavedSearches()
        );
    }

    /**
     * Get searchable fields for an itemtype
     *
     * @param string $itemtype
     * @return array
     */
    public function getSearchableFields(string $itemtype): array
    {
        if ($this->isSavedSearchSource($itemtype)) {
            return $this->getSavedSearchFields($itemtype);
        }

        if (!$this->isItemtypeAllowed($itemtype)) {
            return [];
        }

        if (!class_exists($itemtype)) {
            return [];
        }

        return $this->getItemtypeSearchableFields($itemtype);
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

        if ($this->isSavedSearchSource((string) $itemtype)) {
            return $this->executeSavedSearchQuery($queryConfig);
        }

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

    private function getAvailableSavedSearches(): array
    {
        global $DB;

        if (!SavedSearch::canView()) {
            return [];
        }

        $searches = [];
        $criteria = SavedSearch::getVisibilityCriteria();
        $criteria = array_merge($criteria, [
            'SELECT' => [
                'id',
                'name',
                'itemtype',
            ],
            'FROM'   => SavedSearch::getTable(),
            'ORDER'  => ['name ASC'],
        ]);
        $criteria['WHERE'][] = ['type' => SavedSearch::SEARCH];

        foreach ($DB->request($criteria) as $row) {
            $savedSearch = new SavedSearch();
            if (!$savedSearch->getFromDB((int) $row['id'])) {
                continue;
            }

            if (!class_exists($row['itemtype']) && $row['itemtype'] !== 'AllAssets') {
                continue;
            }

            $searches[] = [
                'itemtype' => self::SAVED_SEARCH_PREFIX . (int) $row['id'],
                'name' => sprintf(
                    '%s (%s)',
                    $row['name'],
                    is_a($row['itemtype'], CommonDBTM::class, true)
                        ? $row['itemtype']::getTypeName(1)
                        : $row['itemtype']
                ),
                'category' => __('Saved searches'),
                'source_type' => 'saved_search',
                'savedsearches_id' => (int) $row['id'],
                'base_itemtype' => $row['itemtype'],
            ];
        }

        return $searches;
    }

    private function getSavedSearchFields(string $source): array
    {
        $savedSearch = $this->getSavedSearchFromSource($source);
        if ($savedSearch === null) {
            return [];
        }

        $params = $savedSearch->getParameters($savedSearch->getID());
        if (!$params) {
            return [];
        }

        $itemtype = $savedSearch->fields['itemtype'];
        if (!class_exists($itemtype) && $itemtype !== 'AllAssets') {
            return [];
        }

        $fields = $this->getItemtypeSearchableFields($itemtype);
        $selected = array_map('strval', $params['toview'] ?? []);

        if (empty($selected)) {
            return $fields;
        }

        usort($fields, static function (array $left, array $right) use ($selected): int {
            $leftIndex = array_search((string) $left['id'], $selected, true);
            $rightIndex = array_search((string) $right['id'], $selected, true);

            $leftIndex = $leftIndex === false ? PHP_INT_MAX : $leftIndex;
            $rightIndex = $rightIndex === false ? PHP_INT_MAX : $rightIndex;

            return $leftIndex <=> $rightIndex;
        });

        return $fields;
    }

    private function getItemtypeSearchableFields(string $itemtype): array
    {
        $searchOptions = Search::getOptions($itemtype);
        $fields = [];

        foreach ($searchOptions as $id => $option) {
            if (!is_array($option) || !isset($option['name'])) {
                continue;
            }

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

    private function executeSavedSearchQuery(array $queryConfig): array
    {
        try {
            $savedSearch = $this->getSavedSearchFromSource((string) ($queryConfig['itemtype'] ?? ''));
            if ($savedSearch === null) {
                return [
                    'success' => false,
                    'error' => 'Saved search not found or not allowed',
                    'timestamp' => time(),
                ];
            }

            $limit = min($queryConfig['limit'] ?? $this->defaultLimit, $this->maxLimit);
            $data = $this->executeSavedSearchListQuery(
                $savedSearch,
                $queryConfig['output_fields'] ?? [],
                $queryConfig['order_by'] ?? null,
                $limit
            );

            return [
                'success' => true,
                'data' => $data['rows'],
                'total' => $data['total'],
                'columns' => $data['columns'] ?? [],
                'meta' => [
                    'itemtype' => $savedSearch->fields['itemtype'],
                    'source_type' => 'saved_search',
                    'savedsearches_id' => $savedSearch->getID(),
                    'limit' => $limit,
                    'has_more' => $data['total'] > count($data['rows']),
                ],
                'timestamp' => time(),
                'from_cache' => false,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'timestamp' => time(),
            ];
        }
    }

    private function executeSavedSearchListQuery(
        SavedSearch $savedSearch,
        array $outputFields,
        ?array $orderBy,
        int $limit
    ): array {
        $params = $savedSearch->getParameters($savedSearch->getID());
        if (!$params) {
            throw new \RuntimeException('Saved search #' . $savedSearch->getID() . ' seems to be broken!');
        }

        $itemtype = $savedSearch->fields['itemtype'];
        $params['itemtype'] = $itemtype;
        $params['start'] = 0;
        $params['reset'] = 'reset';

        if (!empty($outputFields)) {
            $params['display_type'] = 'csv';
            $params['toview'] = array_values(array_filter($outputFields, static fn($field) => is_numeric($field)));
        }

        if (!empty($orderBy['field'])) {
            $params['sort'] = $orderBy['field'];
            $params['order'] = $orderBy['direction'] ?? 'DESC';
        }

        $searchData = Search::getDatas($itemtype, $params);

        return $this->normalizeSearchDataRows($searchData, $outputFields, $limit);
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
        $effectiveDateRange = $dateRange ?? $this->extractDateRangeFromFilters($filters, $groupBy);

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

        $sql .= " ORDER BY " . $this->buildAggregatedOrderByClause($groupBy, $orderBy, $dateIntervalConfig, $effectiveDateRange);

        $sql .= " LIMIT $limit";

        $result = $DB->query($sql);
        if (!$result) {
            throw new \RuntimeException($DB->error() ?: 'Failed to execute aggregated query');
        }

        $rows = [];

        while ($row = $DB->fetchAssoc($result)) {
            $rows[] = $row;
        }

        // Fill date gaps for date-grouped queries using the explicit or inferred date range.
        if ($dateIntervalConfig) {
            $rows = $this->dateGapFiller->fillDateGaps($rows, $effectiveDateRange, $dateIntervalConfig);
            $rows = $this->sortDateGroupedRows(
                $rows,
                'group_' . $dateIntervalConfig['field'],
                $this->getDateGroupedSortDirection($groupBy, $orderBy, $dateIntervalConfig, $effectiveDateRange)
            );
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

    private function buildAggregatedOrderByClause(
        array $groupBy,
        ?array $orderBy,
        ?array $dateIntervalConfig,
        ?array $dateRange
    ): string {
        $orderField = $orderBy['field'] ?? null;
        $direction = $this->normalizeSortDirection($orderBy['direction'] ?? null);

        if ($orderField !== null) {
            $groupAlias = $this->getGroupedFieldAlias($groupBy, $orderField);
            if ($groupAlias !== null) {
                return "`$groupAlias` $direction";
            }
        }

        // Keep the previous fallback for date ranges when no explicit order is configured.
        if ($dateIntervalConfig && $dateRange) {
            $alias = 'group_' . $dateIntervalConfig['field'];
            return "`$alias` ASC";
        }

        return "`value` DESC";
    }

    private function getGroupedFieldAlias(array $groupBy, $orderField): ?string
    {
        foreach ($groupBy as $groupItem) {
            if (is_array($groupItem) && isset($groupItem['field']) && (string) $groupItem['field'] === (string) $orderField) {
                return 'group_' . $groupItem['field'];
            }

            if (is_scalar($groupItem) && (string) $groupItem === (string) $orderField) {
                return 'group_' . $groupItem;
            }
        }

        return null;
    }

    private function normalizeSortDirection(?string $direction): string
    {
        return strtoupper($direction ?? '') === 'ASC' ? 'ASC' : 'DESC';
    }

    private function getDateGroupedSortDirection(
        array $groupBy,
        ?array $orderBy,
        ?array $dateIntervalConfig,
        ?array $dateRange
    ): ?string {
        if ($dateIntervalConfig === null) {
            return null;
        }

        $orderField = $orderBy['field'] ?? null;
        if ($orderField !== null) {
            $groupAlias = $this->getGroupedFieldAlias($groupBy, $orderField);
            if ($groupAlias !== null) {
                return $this->normalizeSortDirection($orderBy['direction'] ?? null);
            }
        }

        if ($dateRange !== null) {
            return 'ASC';
        }

        return null;
    }

    private function sortDateGroupedRows(array $rows, string $alias, ?string $direction): array
    {
        if ($direction === null || count($rows) < 2) {
            return $rows;
        }

        usort($rows, static function (array $left, array $right) use ($alias, $direction): int {
            $leftValue = (string) ($left[$alias] ?? '');
            $rightValue = (string) ($right[$alias] ?? '');
            $comparison = strcmp($leftValue, $rightValue);

            return $direction === 'DESC' ? -$comparison : $comparison;
        });

        return $rows;
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

        return $this->normalizeSearchDataRows($searchData, $outputFields, $limit);
    }

    private function normalizeSearchDataRows(array $searchData, array $outputFields, int $limit): array
    {
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

        if (isset($searchData['data']['cols'])) {
            foreach ($searchData['data']['cols'] as $col) {
                $colId = $col['id'] ?? '';
                if (!empty($outputFields) && !in_array($colId, $outputFields)) {
                    continue;
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

    private function isSavedSearchSource(string $itemtype): bool
    {
        return str_starts_with($itemtype, self::SAVED_SEARCH_PREFIX);
    }

    private function getSavedSearchFromSource(string $source): ?SavedSearch
    {
        if (!$this->isSavedSearchSource($source)) {
            return null;
        }

        $id = (int) substr($source, strlen(self::SAVED_SEARCH_PREFIX));
        if ($id <= 0) {
            return null;
        }

        $savedSearch = new SavedSearch();
        if (!$savedSearch->getFromDB($id)) {
            return null;
        }

        if ((int) $savedSearch->fields['type'] !== SavedSearch::SEARCH) {
            return null;
        }

        $criteria = SavedSearch::getVisibilityCriteria();
        $criteria = array_merge($criteria, [
            'SELECT' => ['id'],
            'FROM'   => SavedSearch::getTable(),
            'WHERE'  => array_merge($criteria['WHERE'] ?? [], [
                'id' => $id,
                'type' => SavedSearch::SEARCH,
            ]),
            'LIMIT'  => 1,
        ]);

        global $DB;
        if (count($DB->request($criteria)) === 0) {
            return null;
        }

        return $savedSearch;
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
