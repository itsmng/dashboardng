<?php

namespace GlpiPlugin\Dashboardng\DataSources;

use CommonDBTM;
use Search;
use Session;

/**
 * Generic Data Source for querying any GLPI itemtype
 * Leverages GLPI's Search engine with entity permissions
 */
class GenericDataSource
{
    /** @var array Allowed itemtypes for security */
    private static array $allowedItemtypes = [
        'Ticket',
        'Problem',
        'Change',
        'Computer',
        'Monitor',
        'Printer',
        'Phone',
        'Peripheral',
        'Software',
        'SoftwareLicense',
        'SoftwareVersion',
        'NetworkEquipment',
        'Certificate',
        'Domain',
        'User',
        'Group',
        'Entity',
        'Location',
        'ITILCategory',
        'ITILFollowup',
        'TicketTask',
        'Project',
        'ProjectTask',
        'Contract',
        'Supplier',
        'Contact',
        'Document',
        'KnowbaseItem',
        'Cartridge',
        'Consumable',
        'Rack',
        'Enclosure',
        'PDU',
        'PassiveDCEquipment',
        'Cable',
        'Socket',
    ];

    /** @var int Default row limit */
    private int $defaultLimit = 1000;

    /** @var int Maximum row limit */
    private int $maxLimit = 10000;

    /** @var int Query timeout in seconds */
    private int $timeout = 30;

    /**
     * Constructor with configurable limits
     */
    public function __construct(?array $config = null)
    {
        if ($config) {
            $this->defaultLimit = $config['default_limit'] ?? $this->defaultLimit;
            $this->maxLimit = $config['max_limit'] ?? $this->maxLimit;
            $this->timeout = $config['timeout'] ?? $this->timeout;
        }
    }

    /**
     * Get list of available itemtypes with metadata
     *
     * @return array
     */
    public function getAvailableItemtypes(): array
    {
        $result = [];

        foreach (self::$allowedItemtypes as $itemtype) {
            if (!class_exists($itemtype)) {
                continue;
            }

            /** @var CommonDBTM $item */
            $item = new $itemtype();

            // Check read permission
            if (!$item->canView()) {
                continue;
            }

            $result[] = [
                'itemtype' => $itemtype,
                'name' => $item->getTypeName(2),
                'icon' => $this->getItemtypeIcon($itemtype),
                'category' => $this->getItemtypeCategory($itemtype),
                'table' => $item->getTable(),
            ];
        }

        usort($result, fn($a, $b) => strcmp($a['category'] . $a['name'], $b['category'] . $b['name']));

        return $result;
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
            // Check if this is a multi-series query
            if ($series && $aggregation && $groupBy) {
                $data = $this->executeMultiSeriesQuery($itemtype, $series, $groupBy, $aggregation);
                return [
                    'success' => true,
                    'data' => $data,
                    'meta' => [
                        'itemtype' => $itemtype,
                        'is_multi_series' => true,
                    ],
                    'timestamp' => time(),
                ];
            }

            // Build and execute query based on aggregation type
            if ($aggregation && $groupBy) {
                $data = $this->executeAggregatedQuery($itemtype, $filters, $groupBy, $aggregation, $orderBy, $limit, $dateRange);
            } else {
                $data = $this->executeListQuery($itemtype, $filters, $outputFields, $orderBy, $limit);
            }

            return [
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
                $truncatedField = $this->getDateTruncationSQL($fullField, $interval);
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
        $where = $this->buildWhereClause($itemtype, $filters, $searchOptions, $table);

        // Add entity restriction
        $entityWhere = $this->getEntityRestriction($itemtype, $table);
        if ($entityWhere) {
            $where[] = $entityWhere;
        }

        // Build joins for related tables
        $joins = $this->buildJoins($itemtype, array_merge($normalizedGroupBy, [$aggField]), $searchOptions, $table);

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
        $rows = [];

        while ($row = $DB->fetchAssoc($result)) {
            $rows[] = $row;
        }

        // Fill date gaps if we have date interval config and a date range
        if ($dateIntervalConfig && $dateRange) {
            $rows = $this->fillDateGaps($rows, $dateRange, $dateIntervalConfig);
        }

        // Resolve enum/dropdown values to display labels
        $rows = $this->resolveDisplayLabels($rows, $normalizedGroupBy, $searchOptions, $itemtype);

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
     * Execute multi-series query for year-over-year comparisons
     * Executes separate queries for each series (year) and combines results
     *
     * @param string $itemtype
     * @param array $seriesConfigs Array of series configs with 'name' and 'year_filter' keys
     * @param array $groupBy Grouping configuration (field + interval)
     * @param array $aggregation Aggregation function
     * @return array Multi-series data structure
     */
    private function executeMultiSeriesQuery(
        string $itemtype,
        array $seriesConfigs,
        array $groupBy,
        array $aggregation
    ): array {
        $result = ['series' => []];

        foreach ($seriesConfigs as $series) {
            $year = $series['year_filter'];
            $seriesName = $series['name'] ?? (string) $year;

            // Build year-specific date filters
            $filters = [
                ['field' => 15, 'searchtype' => 'between', 'value' => ["$year-01-01", "$year-12-31"]]
            ];

            // Execute aggregated query for this year
            $data = $this->executeAggregatedQuery(
                $itemtype,
                $filters,
                $groupBy,
                $aggregation,
                null, // orderBy - sort chronologically
                12,  // limit - 12 months
                null // dateRange - not needed, we're filtering by year
            );

            // Normalize data to standard format [[label, value], ...]
            $seriesData = [];
            $groupAlias = null;

            // Find the group field alias
            foreach ($data['rows'] as $row) {
                if (empty($groupAlias)) {
                    // Find the group_ field (skip 'value' and calculated fields)
                    foreach (array_keys($row) as $key) {
                        if (str_starts_with($key, 'group_') || str_starts_with($key, 'calculated_')) {
                            $groupAlias = $key;
                            break;
                        }
                    }
                }

                if ($groupAlias && isset($row[$groupAlias]) && isset($row['value'])) {
                    // Format date for display (e.g., "2024-01-01" -> "Jan")
                    $label = $this->formatMonthLabel($row[$groupAlias]);
                    $seriesData[] = [$label, $row['value']];
                }
            }

            $result['series'][] = [
                'name' => $seriesName,
                'data' => $seriesData
            ];
        }

        return $result;
    }

    /**
     * Format a date value to a short month label
     *
     * @param string $dateValue Date value from database
     * @return string Formatted month label (e.g., "Jan")
     */
    private function formatMonthLabel(string $dateValue): string
    {
        try {
            $date = new \DateTime($dateValue);
            return $date->format('M'); // Returns "Jan", "Feb", etc.
        } catch (\Exception $e) {
            return $dateValue;
        }
    }

    /**
     * Resolve raw database values to human-readable display labels
     * Handles status, priority, urgency, impact, dropdown fields, etc.
     */
    private function resolveDisplayLabels(array $rows, array $fieldIds, array $searchOptions, string $itemtype): array
    {
        if (empty($rows)) {
            return $rows;
        }

        // Build resolution map for each field
        $resolvers = [];
        foreach ($fieldIds as $fieldId) {
            $opt = $searchOptions[$fieldId] ?? null;
            if (!$opt) {
                continue;
            }

            $alias = 'group_' . $fieldId;
            $datatype = $opt['datatype'] ?? 'text';
            $fieldName = $opt['field'] ?? '';

            // Determine resolver based on datatype and field name
            $resolver = $this->getFieldResolver($itemtype, $fieldName, $datatype, $opt);
            if ($resolver) {
                $resolvers[$alias] = $resolver;
            }
        }

        if (empty($resolvers)) {
            return $rows;
        }

        // Apply resolvers to each row
        foreach ($rows as &$row) {
            foreach ($resolvers as $alias => $resolver) {
                if (isset($row[$alias])) {
                    $row[$alias] = $resolver($row[$alias]);
                }
            }
        }

        return $rows;
    }

    /**
     * Get a resolver function for a specific field
     * Returns null if no special resolution is needed
     */
    private function getFieldResolver(string $itemtype, string $fieldName, string $datatype, array $opt): ?callable
    {
        // Handle ITIL-specific fields (status, priority, urgency, impact)
        if (is_a($itemtype, 'CommonITILObject', true)) {
            switch ($fieldName) {
                case 'status':
                    return fn($value) => $itemtype::getStatus($value) ?: $value;
                case 'priority':
                    return fn($value) => $itemtype::getPriorityName($value) ?: $value;
                case 'urgency':
                    return fn($value) => $itemtype::getUrgencyName($value) ?: $value;
                case 'impact':
                    return fn($value) => $itemtype::getImpactName($value) ?: $value;
            }
        }

        // Handle Ticket-specific type field
        if ($itemtype === 'Ticket' && $fieldName === 'type') {
            return fn($value) => \Ticket::getTicketTypeName($value) ?: $value;
        }

        // Handle dropdown fields (foreign keys to other tables)
        if ($datatype === 'dropdown') {
            $dropdownTable = $opt['table'] ?? null;
            if ($dropdownTable && $dropdownTable !== \getTableForItemType($itemtype)) {
                $dropdownItemtype = \getItemTypeForTable($dropdownTable);
                if ($dropdownItemtype && class_exists($dropdownItemtype)) {
                    return function ($value) use ($dropdownItemtype) {
                        if (empty($value)) {
                            return __('None');
                        }
                        $item = new $dropdownItemtype();
                        if ($item->getFromDB($value)) {
                            return $item->getName();
                        }
                        return $value;
                    };
                }
            }
        }

        // Handle specific dropdown types
        if ($datatype === 'specific') {
            // These are typically handled by getSpecificValueToDisplay
            $specificTypes = $opt['searchtype'] ?? [];
            if (in_array('equals', (array) $specificTypes)) {
                return function ($value) use ($itemtype, $fieldName, $opt) {
                    if (method_exists($itemtype, 'getSpecificValueToDisplay')) {
                        $display = $itemtype::getSpecificValueToDisplay($fieldName, [$fieldName => $value], []);
                        return $display ?: $value;
                    }
                    return $value;
                };
            }
        }

        // Handle itemlink (references to same itemtype)
        if ($datatype === 'itemlink') {
            return function ($value) use ($itemtype) {
                if (empty($value)) {
                    return __('None');
                }
                $item = new $itemtype();
                if ($item->getFromDB($value)) {
                    return $item->getName();
                }
                return $value;
            };
        }

        return null;
    }

    /**
     * Get SQL expression for truncating a datetime field to the specified interval
     */
    private function getDateTruncationSQL(string $field, string $interval): string
    {
        return match ($interval) {
            'day' => "DATE($field)",
            'week' => "DATE(DATE_SUB($field, INTERVAL WEEKDAY($field) DAY))",
            'month' => "DATE_FORMAT($field, '%Y-%m-01')",
            'year' => "DATE_FORMAT($field, '%Y-01-01')",
            default => "DATE($field)",
        };
    }

    /**
     * Fill gaps in date-grouped results with zero values
     */
    private function fillDateGaps(array $rows, array $dateRange, array $dateIntervalConfig): array
    {
        $start = $dateRange['start'] ?? null;
        $end = $dateRange['end'] ?? null;
        $interval = $dateRange['interval'] ?? $dateIntervalConfig['interval'];
        $fieldId = $dateIntervalConfig['field'];
        $alias = 'group_' . $fieldId;

        if (!$start || !$end) {
            return $rows;
        }

        // Generate all expected dates in the range
        $allDates = $this->generateDateRange($start, $end, $interval);

        // Build a map of existing data by date
        $dataByDate = [];
        foreach ($rows as $row) {
            $dateKey = $row[$alias] ?? null;
            if ($dateKey) {
                // Normalize the date key format
                $normalizedKey = $this->normalizeDateKey($dateKey, $interval);
                $dataByDate[$normalizedKey] = $row;
            }
        }

        // Build result with all dates, filling gaps with zeros
        $filledRows = [];
        foreach ($allDates as $date) {
            $normalizedDate = $this->normalizeDateKey($date, $interval);
            if (isset($dataByDate[$normalizedDate])) {
                $filledRows[] = $dataByDate[$normalizedDate];
            } else {
                $filledRows[] = [
                    $alias => $date,
                    'value' => 0,
                ];
            }
        }

        return $filledRows;
    }

    /**
     * Generate array of dates for a range at the specified interval
     */
    private function generateDateRange(string $start, string $end, string $interval): array
    {
        $dates = [];
        $current = new \DateTime($start);
        $endDate = new \DateTime($end);

        // Adjust start date based on interval
        switch ($interval) {
            case 'week':
                // Start from the beginning of the week
                $dayOfWeek = (int) $current->format('N') - 1; // 0 = Monday
                $current->modify("-$dayOfWeek days");
                break;
            case 'month':
                // Start from the first of the month
                $current->modify('first day of this month');
                break;
            case 'year':
                // Start from the first of the year
                $current->modify('first day of January');
                break;
        }

        $dateInterval = match ($interval) {
            'day' => new \DateInterval('P1D'),
            'week' => new \DateInterval('P1W'),
            'month' => new \DateInterval('P1M'),
            'year' => new \DateInterval('P1Y'),
            default => new \DateInterval('P1D'),
        };

        while ($current <= $endDate) {
            $dates[] = $current->format('Y-m-d');
            $current->add($dateInterval);
        }

        return $dates;
    }

    /**
     * Normalize a date key to Y-m-d format for comparison
     */
    private function normalizeDateKey(string $dateKey, string $interval): string
    {
        try {
            $date = new \DateTime($dateKey);
            return $date->format('Y-m-d');
        } catch (\Exception $e) {
            return $dateKey;
        }
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
                $columns[] = [
                    'id' => $col['id'] ?? '',
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
     * Build WHERE clause from filters
     */
    private function buildWhereClause(string $itemtype, array $filters, array $searchOptions, string $table): array
    {
        global $DB;

        $where = [];

        foreach ($filters as $filter) {
            $fieldId = $filter['field'] ?? null;
            // Support both 'operator' and 'searchtype' keys (for backward compatibility)
            $operator = $filter['operator'] ?? $this->mapSearchTypeToOperator($filter['searchtype'] ?? 'equals');
            $value = $filter['value'] ?? null;

            if ($fieldId === null) {
                continue;
            }

            $opt = $searchOptions[$fieldId] ?? null;
            if (!$opt || !isset($opt['field'])) {
                continue;
            }

            $fieldTable = $opt['table'] ?? $table;
            $fieldName = $opt['field'];
            $fullField = "`$fieldTable`.`$fieldName`";

            switch ($operator) {
                case 'equals':
                    $where[] = "$fullField = " . $DB->quote($value);
                    break;
                case 'not_equals':
                    $where[] = "$fullField != " . $DB->quote($value);
                    break;
                case 'contains':
                    $where[] = "$fullField LIKE " . $DB->quote("%$value%");
                    break;
                case 'not_contains':
                    $where[] = "$fullField NOT LIKE " . $DB->quote("%$value%");
                    break;
                case 'greater_than':
                    $where[] = "$fullField > " . $DB->quote($value);
                    break;
                case 'less_than':
                    $where[] = "$fullField < " . $DB->quote($value);
                    break;
                case 'greater_or_equal':
                    $where[] = "$fullField >= " . $DB->quote($value);
                    break;
                case 'less_or_equal':
                    $where[] = "$fullField <= " . $DB->quote($value);
                    break;
                case 'is_null':
                    $where[] = "$fullField IS NULL";
                    break;
                case 'is_not_null':
                    $where[] = "$fullField IS NOT NULL";
                    break;
                case 'in':
                    if (is_array($value)) {
                        $values = array_map(fn($v) => $DB->quote($v), $value);
                        $where[] = "$fullField IN (" . implode(',', $values) . ")";
                    }
                    break;
                case 'between':
                    if (is_array($value) && count($value) >= 2) {
                        $where[] = "$fullField BETWEEN " . $DB->quote($value[0]) . " AND " . $DB->quote($value[1]);
                    }
                    break;
            }
        }

        return $where;
    }

    /**
     * Build JOINs for related tables
     */
    private function buildJoins(string $itemtype, array $fieldIds, array $searchOptions, string $table): array
    {
        $joins = [];
        $addedTables = [$table => true];

        foreach ($fieldIds as $fieldId) {
            if (!$fieldId)
                continue;

            $opt = $searchOptions[$fieldId] ?? null;
            if (!$opt)
                continue;

            $joinTable = $opt['table'] ?? null;
            if (!$joinTable || isset($addedTables[$joinTable])) {
                continue;
            }

            $linkfield = $opt['linkfield'] ?? 'id';

            // Determine join condition based on relationship
            if ($opt['joinparams'] ?? null) {
                // Use explicit join params if defined
                $jp = $opt['joinparams'];
                $beforejoin = $jp['beforejoin'] ?? null;

                if ($beforejoin) {
                    foreach ((array) $beforejoin as $bj) {
                        $bjTable = $bj['table'] ?? null;
                        if ($bjTable && !isset($addedTables[$bjTable])) {
                            $bjLink = $bj['linkfield'] ?? 'id';
                            $bjJoinOn = $bj['joinparams']['joinon'] ?? "`$table`.`$bjLink` = `$bjTable`.`id`";
                            $joins[] = "LEFT JOIN `$bjTable` ON $bjJoinOn";
                            $addedTables[$bjTable] = true;
                        }
                    }
                }

                $joinOn = $jp['joinon'] ?? "`$table`.`$linkfield` = `$joinTable`.`id`";
                $joins[] = "LEFT JOIN `$joinTable` ON $joinOn";
            } else {
                // Default join logic
                $joins[] = "LEFT JOIN `$joinTable` ON `$table`.`$linkfield` = `$joinTable`.`id`";
            }

            $addedTables[$joinTable] = true;
        }

        return $joins;
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
        return in_array($itemtype, self::$allowedItemtypes, true);
    }

    /**
     * Get icon for itemtype
     */
    private function getItemtypeIcon(string $itemtype): string
    {
        $icons = [
            'Ticket' => 'fa-ticket-alt',
            'Problem' => 'fa-exclamation-triangle',
            'Change' => 'fa-exchange-alt',
            'Computer' => 'fa-desktop',
            'Monitor' => 'fa-tv',
            'Printer' => 'fa-print',
            'Phone' => 'fa-phone',
            'Software' => 'fa-cube',
            'User' => 'fa-user',
            'Group' => 'fa-users',
            'Entity' => 'fa-building',
            'Location' => 'fa-map-marker-alt',
            'Project' => 'fa-project-diagram',
            'Contract' => 'fa-file-contract',
            'Document' => 'fa-file-alt',
            'KnowbaseItem' => 'fa-book',
            'NetworkEquipment' => 'fa-network-wired',
        ];

        return $icons[$itemtype] ?? 'fa-cube';
    }

    /**
     * Get category for itemtype
     */
    private function getItemtypeCategory(string $itemtype): string
    {
        $categories = [
            'Ticket' => 'ITIL',
            'Problem' => 'ITIL',
            'Change' => 'ITIL',
            'ITILCategory' => 'ITIL',
            'ITILFollowup' => 'ITIL',
            'TicketTask' => 'ITIL',
            'Computer' => 'Assets',
            'Monitor' => 'Assets',
            'Printer' => 'Assets',
            'Phone' => 'Assets',
            'Peripheral' => 'Assets',
            'NetworkEquipment' => 'Assets',
            'Software' => 'Assets',
            'SoftwareLicense' => 'Assets',
            'Certificate' => 'Assets',
            'User' => 'Organization',
            'Group' => 'Organization',
            'Entity' => 'Organization',
            'Location' => 'Organization',
            'Project' => 'Projects',
            'ProjectTask' => 'Projects',
            'Contract' => 'Management',
            'Supplier' => 'Management',
            'Document' => 'Management',
            'KnowbaseItem' => 'Knowledge',
        ];

        return $categories[$itemtype] ?? 'Other';
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
        // Most fields can be grouped, except very long text fields
        $datatype = $option['datatype'] ?? 'text';
        return !in_array($datatype, ['text', 'longtext']);
    }

    /**
     * Add custom itemtype to allowed list (for plugins)
     */
    public static function addAllowedItemtype(string $itemtype): void
    {
        if (!in_array($itemtype, self::$allowedItemtypes, true)) {
            self::$allowedItemtypes[] = $itemtype;
        }
    }

    /**
     * Map GLPI searchtype to internal operator
     * GLPI uses searchtype names like 'morethan', 'lessthan', 'notequals'
     * Internal operators use names like 'greater_or_equal', 'less_than', 'not_equals'
     */
    private function mapSearchTypeToOperator(string $searchType): string
    {
        return match ($searchType) {
            'equals' => 'equals',
            'notequals' => 'not_equals',
            'contains' => 'contains',
            'notcontains' => 'not_contains',
            'morethan' => 'greater_or_equal',
            'lessthan' => 'less_than',
            'empty' => 'is_null',
            'between' => 'between',
            default => 'equals',
        };
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
}
