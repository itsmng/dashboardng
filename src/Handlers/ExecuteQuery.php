<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\DataSources\GenericDataSource;
use GlpiPlugin\Dashboardng\PluginDashboardngConfig;

/**
 * Handler for executing dynamic queries
 */
class ExecuteQuery
{
    public function handle(array $queryConfig): array
    {
        // Validate required fields
        if (empty($queryConfig['itemtype'])) {
            return [
                'success' => false,
                'error' => 'Missing required field: itemtype',
                'timestamp' => time(),
            ];
        }

        try {
            // Load limits from config
            $config = PluginDashboardngConfig::getConfig();
            $dataSource = new GenericDataSource([
                'default_limit' => $config['query_default_limit'] ?? 1000,
                'max_limit' => $config['query_max_limit'] ?? 10000,
                'timeout' => $config['query_timeout'] ?? 30,
            ]);

            return $dataSource->executeQuery($queryConfig);
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'timestamp' => time(),
            ];
        }
    }
}
