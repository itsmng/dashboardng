<?php

namespace GlpiPlugin\Dashboardng\DataSources;

/**
 * Field Resolver - Resolves raw database values to display labels
 * Handles status, priority, urgency, impact, dropdown fields, etc.
 */
class FieldResolver
{
    /**
     * Resolve raw database values to human-readable display labels
     *
     * @param array $rows Array of rows from database
     * @param array $fieldIds Array of field IDs that need resolution
     * @param array $searchOptions GLPI search options for itemtype
     * @param string $itemtype Item type being queried
     * @return array Rows with resolved labels
     */
    public function resolveDisplayLabels(array $rows, array $fieldIds, array $searchOptions, string $itemtype): array
    {
        if (empty($rows)) {
            return $rows;
        }

        $resolvers = [];

        foreach ($fieldIds as $fieldId) {
            $opt = $searchOptions[$fieldId] ?? null;
            if (!$opt) {
                continue;
            }

            $alias = 'group_' . $fieldId;
            $datatype = $opt['datatype'] ?? 'text';
            $fieldName = $opt['field'] ?? '';

            $resolver = $this->getFieldResolver($itemtype, $fieldName, $datatype, $opt);
            if ($resolver) {
                $resolvers[$alias] = $resolver;
            }
        }

        if (empty($resolvers)) {
            return $rows;
        }

        return $this->applyResolvers($rows, $resolvers);
    }

    /**
     * Apply resolvers to each row
     *
     * @param array $rows Rows to resolve
     * @param array $resolvers Array of resolver functions keyed by field alias
     * @return array Resolved rows
     */
    private function applyResolvers(array $rows, array $resolvers): array
    {
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
     *
     * @param string $itemtype
     * @param string $fieldName
     * @param string $datatype
     * @param array $opt Search options for field
     * @return callable|null Resolver function
     */
    private function getFieldResolver(string $itemtype, string $fieldName, string $datatype, array $opt): ?callable
    {
        if (is_a($itemtype, 'CommonITILObject', true)) {
            return $this->getITILFieldResolver($itemtype, $fieldName);
        }

        if ($itemtype === 'Ticket' && $fieldName === 'type') {
            return fn($value) => \Ticket::getTicketTypeName($value) ?: $value;
        }

        if ($datatype === 'dropdown') {
            return $this->getDropdownResolver($opt, $itemtype);
        }

        if ($datatype === 'specific') {
            return $this->getSpecificResolver($opt, $itemtype, $fieldName);
        }

        if ($datatype === 'itemlink') {
            return $this->getItemlinkResolver($itemtype);
        }

        return null;
    }

    /**
     * Get resolver for ITIL fields (status, priority, urgency, impact)
     *
     * @param string $itemtype
     * @param string $fieldName
     * @return callable|null
     */
    private function getITILFieldResolver(string $itemtype, string $fieldName): ?callable
    {
        return match ($fieldName) {
            'status' => fn($value) => $itemtype::getStatus($value) ?: $value,
            'priority' => fn($value) => $itemtype::getPriorityName($value) ?: $value,
            'urgency' => fn($value) => $itemtype::getUrgencyName($value) ?: $value,
            'impact' => fn($value) => $itemtype::getImpactName($value) ?: $value,
            default => null,
        };
    }

    /**
     * Get resolver for dropdown fields (foreign keys to other tables)
     *
     * @param array $opt Search options
     * @param string $itemtype Main item type
     * @return callable|null
     */
    private function getDropdownResolver(array $opt, string $itemtype): ?callable
    {
        $dropdownTable = $opt['table'] ?? null;
        if (!$dropdownTable || $dropdownTable === \getTableForItemType($itemtype)) {
            return null;
        }

        $dropdownItemtype = \getItemTypeForTable($dropdownTable);
        if (!$dropdownItemtype || !class_exists($dropdownItemtype)) {
            return null;
        }

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

    /**
     * Get resolver for specific dropdown types
     *
     * @param array $opt Search options
     * @param string $itemtype Item type
     * @param string $fieldName Field name
     * @return callable|null
     */
    private function getSpecificResolver(array $opt, string $itemtype, string $fieldName): ?callable
    {
        $specificTypes = $opt['searchtype'] ?? [];
        if (!in_array('equals', (array) $specificTypes)) {
            return null;
        }

        return function ($value) use ($itemtype, $fieldName, $opt) {
            if (!method_exists($itemtype, 'getSpecificValueToDisplay')) {
                return $value;
            }
            $display = $itemtype::getSpecificValueToDisplay($fieldName, [$fieldName => $value], []);
            return $display ?: $value;
        };
    }

    /**
     * Get resolver for itemlink fields (references to same itemtype)
     *
     * @param string $itemtype Item type
     * @return callable|null
     */
    private function getItemlinkResolver(string $itemtype): callable
    {
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
}
