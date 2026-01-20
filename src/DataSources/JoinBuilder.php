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
            if (!$fieldId) {
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
        if ($opt['joinparams'] ?? null) {
            $this->addJoinWithExplicitParams(
                $joins,
                $addedTables,
                $opt['joinparams'],
                $mainTable,
                $joinTable,
                $linkfield
            );
        } else {
            $this->addDefaultJoin($joins, $mainTable, $joinTable, $linkfield);
        }

        $addedTables[$joinTable] = true;
    }

    /**
     * Add join using explicit join parameters
     *
     * @param array $joins Array to append join clauses to
     * @param array $addedTables Array to track added tables
     * @param array $joinParams Join parameters from search option
     * @param string $mainTable Main table name
     * @param string $joinTable Table to join
     * @param string $linkfield Field to join on
     * @return void
     */
    private function addJoinWithExplicitParams(
        array &$joins,
        array &$addedTables,
        array $joinParams,
        string $mainTable,
        string $joinTable,
        string $linkfield
    ): void {
        $beforejoin = $joinParams['beforejoin'] ?? null;

        if ($beforejoin) {
            foreach ((array) $beforejoin as $bj) {
                $bjTable = $bj['table'] ?? null;
                if ($bjTable && !isset($addedTables[$bjTable])) {
                    $bjLink = $bj['linkfield'] ?? 'id';
                    $bjJoinOn = $bj['joinparams']['joinon'] ?? "`$mainTable`.`$bjLink` = `$bjTable`.`id`";
                    $joins[] = "LEFT JOIN `$bjTable` ON $bjJoinOn";
                    $addedTables[$bjTable] = true;
                }
            }
        }

        $joinOn = $joinParams['joinon'] ?? "`$mainTable`.`$linkfield` = `$joinTable`.`id`";
        $joins[] = "LEFT JOIN `$joinTable` ON $joinOn";
    }

    /**
     * Add default join (simple foreign key join)
     *
     * @param array $joins Array to append join clauses to
     * @param string $mainTable Main table name
     * @param string $joinTable Table to join
     * @param string $linkfield Field to join on
     * @return void
     */
    private function addDefaultJoin(
        array &$joins,
        string $mainTable,
        string $joinTable,
        string $linkfield
    ): void {
        $joins[] = "LEFT JOIN `$joinTable` ON `$mainTable`.`$linkfield` = `$joinTable`.`id`";
    }
}
