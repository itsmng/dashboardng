<?php

namespace GlpiPlugin\Dashboardng\DataSources;

/**
 * Join Builder - Builds LEFT JOIN clauses for related tables
 */
class JoinBuilder
{
    /**
     * Build JOINs for related tables
     *
     * @param string $itemtype Main item type being queried
     * @param array $fieldIds Array of field IDs requiring joins
     * @param array $searchOptions GLPI search options for itemtype
     * @param string $table Main table name
     * @return array Array of JOIN clauses
     */
    public function buildJoins(string $itemtype, array $fieldIds, array $searchOptions, string $table): array
    {
        $joins = [];
        $addedTables = [$table => true];

        foreach ($fieldIds as $fieldId) {
            if (!$fieldId || !is_scalar($fieldId)) {
                continue;
            }

            $opt = $searchOptions[$fieldId] ?? null;
            if (!$opt) {
                continue;
            }

            $joinTable = $opt['table'] ?? null;
            if (!$joinTable || isset($addedTables[$joinTable])) {
                continue;
            }

            $linkfield = $opt['linkfield'] ?? 'id';

            $this->addJoinWithDependencies(
                $joins,
                $addedTables,
                $opt,
                $table,
                $joinTable,
                $linkfield
            );
        }

        return $joins;
    }

    /**
     * Add a join with its dependencies (beforejoin)
     *
     * @param array $joins Array to append join clauses to
     * @param array $addedTables Array to track added tables
     * @param array $opt Search option for the field
     * @param string $mainTable Main table name
     * @param string $joinTable Table to join
     * @param string $linkfield Field to join on
     * @return void
     */
    private function addJoinWithDependencies(
        array &$joins,
        array &$addedTables,
        array $opt,
        string $mainTable,
        string $joinTable,
        string $linkfield
    ): void {
        $joinParams = $opt['joinparams'] ?? [];
        $referenceTable = $mainTable;

        foreach ($this->normalizeBeforeJoin($joinParams['beforejoin'] ?? null) as $beforeJoin) {
            $beforeJoinTable = $beforeJoin['table'] ?? null;
            if (!$beforeJoinTable) {
                continue;
            }

            $beforeJoinParams = $beforeJoin['joinparams'] ?? [];
            $beforeJoinLinkfield = $beforeJoin['linkfield'] ?? $this->getForeignKeyField($beforeJoinTable);

            $this->addJoinClause(
                $joins,
                $addedTables,
                $referenceTable,
                $beforeJoinTable,
                $beforeJoinLinkfield,
                $beforeJoinParams
            );

            if (!($beforeJoinParams['nolink'] ?? false)) {
                $referenceTable = $beforeJoinTable;
            }
        }

        $this->addJoinClause($joins, $addedTables, $referenceTable, $joinTable, $linkfield, $joinParams);
    }

    /**
     * Normalize beforejoin configuration to an array of join definitions.
     *
     * @param mixed $beforejoin Raw beforejoin value
     * @return array
     */
    private function normalizeBeforeJoin($beforejoin): array
    {
        if (!is_array($beforejoin)) {
            return [];
        }

        if (isset($beforejoin['table'])) {
            return [$beforejoin];
        }

        return array_values(array_filter($beforejoin, 'is_array'));
    }

    private function getForeignKeyField(string $table): string
    {
        if (!str_starts_with($table, 'glpi_')) {
            return '';
        }

        return substr($table, 5) . '_id';
    }

    /**
     * Add join clause for a single table relation.
     *
     * @param array $joins Array to append join clauses to
     * @param array $addedTables Array to track added tables
     * @param string $referenceTable Already joined reference table
     * @param string $joinTable Table to join
     * @param string $linkfield Field used by standard joins
     * @param array $joinParams Join parameters from search option
     * @return void
     */
    private function addJoinClause(
        array &$joins,
        array &$addedTables,
        string $referenceTable,
        string $joinTable,
        string $linkfield,
        array $joinParams = []
    ): void {
        if (isset($addedTables[$joinTable])) {
            return;
        }

        if (isset($joinParams['joinon']) && $joinParams['joinon']) {
            $joinOn = $joinParams['joinon'];
        } else {
            $jointype = $joinParams['jointype'] ?? 'standard';
            $joinOn = $this->buildJoinCondition(
                $jointype,
                $referenceTable,
                $joinTable,
                $linkfield,
                $joinParams
            );
        }

        $joins[] = "LEFT JOIN `$joinTable` ON $joinOn";
        $addedTables[$joinTable] = true;
    }

    private function buildJoinCondition(
        string $jointype,
        string $referenceTable,
        string $joinTable,
        string $linkfield,
        array $joinParams
    ): string {
        return match ($jointype) {
            'child' => $this->buildChildJoinCondition($referenceTable, $joinTable, $joinParams),
            'itemtype_item' => $this->buildItemtypeItemJoinCondition($referenceTable, $joinTable, $joinParams),
            'mainitemtype_mainitem' => $this->buildItemtypeItemJoinCondition($referenceTable, $joinTable, $joinParams, 'main'),
            'itemtype_item_revert' => $this->buildItemtypeItemRevertJoinCondition($referenceTable, $joinTable, $joinParams),
            default => "`$referenceTable`.`$linkfield` = `$joinTable`.`id`",
        };
    }

    private function buildChildJoinCondition(string $referenceTable, string $joinTable, array $joinParams): string
    {
        $childLinkfield = $joinParams['linkfield'] ?? $this->getForeignKeyField($referenceTable);
        return "`$referenceTable`.`id` = `$joinTable`.`$childLinkfield`";
    }

    private function buildItemtypeItemJoinCondition(
        string $referenceTable,
        string $joinTable,
        array $joinParams,
        string $prefix = ''
    ): string {
        $itemField = $prefix . 'items_id';
        $typeField = $prefix . 'itemtype';
        $itemtype = $joinParams['specific_itemtype'] ?? $this->getItemtypeForTable($referenceTable);

        return "`$referenceTable`.`id` = `$joinTable`.`$itemField`"
            . " AND `$joinTable`.`$typeField` = '$itemtype'";
    }

    private function buildItemtypeItemRevertJoinCondition(
        string $referenceTable,
        string $joinTable,
        array $joinParams,
        string $prefix = ''
    ): string {
        $itemField = $prefix . 'items_id';
        $typeField = $prefix . 'itemtype';
        $itemtype = $joinParams['specific_itemtype'] ?? $this->getItemtypeForTable($joinTable);

        return "`$joinTable`.`id` = `$referenceTable`.`$itemField`"
            . " AND `$referenceTable`.`$typeField` = '$itemtype'";
    }

    private function getItemtypeForTable(string $table): string
    {
        $itemtype = \getItemTypeForTable($table);
        if (is_string($itemtype) && $itemtype !== '') {
            return $itemtype;
        }

        if (!str_starts_with($table, 'glpi_')) {
            return $table;
        }

        $name = substr($table, 5);
        $name = preg_replace('/ies$/', 'y', $name);
        $name = preg_replace('/s$/', '', $name);

        return str_replace(' ', '', ucwords(str_replace('_', ' ', $name)));
    }
}
