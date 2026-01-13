<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\DataSources\GenericDataSource;
use GlpiPlugin\Dashboardng\PluginDashboardngConfig;

/**
 * Handler for listing available data sources (itemtypes)
 */
class GetDataSources
{
    public function handle(array $params = []): array
    {
        try {
            $config = PluginDashboardngConfig::getConfig();
            $dataSource = new GenericDataSource([
                'default_limit' => $config['query_default_limit'] ?? 1000,
                'max_limit' => $config['query_max_limit'] ?? 10000,
                'timeout' => $config['query_timeout'] ?? 30,
            ]);

            $itemtypes = $dataSource->getAvailableItemtypes();
            $limits = $dataSource->getLimits();

            // Group by category
            $grouped = [];
            foreach ($itemtypes as $item) {
                $cat = $item['category'];
                if (!isset($grouped[$cat])) {
                    $grouped[$cat] = [];
                }
                $grouped[$cat][] = $item;
            }

            return [
                'success' => true,
                'data' => [
                    'itemtypes' => $itemtypes,
                    'grouped' => $grouped,
                    'categories' => array_keys($grouped),
                ],
                'limits' => $limits,
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
