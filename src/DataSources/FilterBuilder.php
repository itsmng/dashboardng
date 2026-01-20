<?php

namespace GlpiPlugin\Dashboardng\DataSources;

/**
 * Filter Builder - Builds WHERE clauses from filter arrays
 */
class FilterBuilder
{
    /**
     * Build WHERE clause from filters
     *
     * @param string $itemtype Item type being queried
     * @param array $filters Array of filter conditions
     * @param array $searchOptions GLPI search options for itemtype
     * @param string $table Main table name
     * @return array Array of WHERE conditions
     */
    public function buildWhereClause(string $itemtype, array $filters, array $searchOptions, string $table): array
    {
        global $DB;

        $where = [];

        foreach ($filters as $filter) {
            $fieldId = $filter['field'] ?? null;
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

            $condition = $this->buildCondition($fullField, $operator, $value, $DB);
            if ($condition !== null) {
                $where[] = $condition;
            }
        }

        return $where;
    }

    /**
     * Build a single WHERE condition
     *
     * @param string $fullField Full field reference with table
     * @param string $operator Comparison operator
     * @param mixed $value Value to compare
     * @param \DBmysql $DB Database instance
     * @return string|null WHERE condition or null if invalid
     */
    private function buildCondition(string $fullField, string $operator, $value, $DB): ?string
    {
        return match ($operator) {
            'equals' => "$fullField = " . $DB->quote($value),
            'not_equals' => "$fullField != " . $DB->quote($value),
            'contains' => "$fullField LIKE " . $DB->quote("%$value%"),
            'not_contains' => "$fullField NOT LIKE " . $DB->quote("%$value%"),
            'greater_than' => "$fullField > " . $DB->quote($value),
            'less_than' => "$fullField < " . $DB->quote($value),
            'greater_or_equal' => "$fullField >= " . $DB->quote($value),
            'less_or_equal' => "$fullField <= " . $DB->quote($value),
            'is_null' => "$fullField IS NULL",
            'is_not_null' => "$fullField IS NOT NULL",
            'in' => $this->buildInCondition($fullField, $value, $DB),
            'between' => $this->buildBetweenCondition($fullField, $value, $DB),
            default => null,
        };
    }

    /**
     * Build IN condition
     *
     * @param string $fullField
     * @param mixed $value
     * @param \DBmysql $DB
     * @return string|null
     */
    private function buildInCondition(string $fullField, $value, $DB): ?string
    {
        if (!is_array($value)) {
            return null;
        }

        $values = array_map(fn($v) => $DB->quote($v), $value);
        return "$fullField IN (" . implode(',', $values) . ")";
    }

    /**
     * Build BETWEEN condition
     *
     * @param string $fullField
     * @param mixed $value
     * @param \DBmysql $DB
     * @return string|null
     */
    private function buildBetweenCondition(string $fullField, $value, $DB): ?string
    {
        if (!is_array($value) || count($value) < 2) {
            return null;
        }

        return "$fullField BETWEEN " . $DB->quote($value[0]) . " AND " . $DB->quote($value[1]);
    }

    /**
     * Map GLPI searchtype to internal operator
     *
     * @param string $searchType
     * @return string
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
}
