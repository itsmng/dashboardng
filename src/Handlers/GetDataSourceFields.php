<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\DataSources\GenericDataSource;

/**
 * Handler for getting searchable fields for an itemtype
 */
class GetDataSourceFields
{
    public function handle(string $itemtype, array $params = []): array
    {
        try {
            $dataSource = new GenericDataSource();
            $fields = $dataSource->getSearchableFields($itemtype);

            if (empty($fields)) {
                return [
                    'success' => false,
                    'error' => "No searchable fields found for itemtype: $itemtype",
                    'timestamp' => time(),
                ];
            }

            // Group fields by characteristics
            $aggregatable = [];
            $groupable = [];
            $filterable = [];

            foreach ($fields as $field) {
                if ($field['aggregatable']) {
                    $aggregatable[] = $field;
                }
                if ($field['groupable']) {
                    $groupable[] = $field;
                }
                $filterable[] = $field;
            }

            return [
                'success' => true,
                'data' => [
                    'itemtype' => $itemtype,
                    'fields' => $fields,
                    'aggregatable' => $aggregatable,
                    'groupable' => $groupable,
                    'filterable' => $filterable,
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
}
