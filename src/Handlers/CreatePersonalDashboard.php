<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use Session;

/**
 * Handler for creating a personal dashboard (copy from global)
 */
class CreatePersonalDashboard
{
    public function __invoke(array $params = []): array
    {
        $name = $params['name'] ?? 'My Dashboard';
        $sourceDashboardId = $params['source_dashboard_id'] ?? 0;

        $dashboardId = PluginDashboardngDashboard::createPersonalDashboard(
            (int) $sourceDashboardId,
            $name
        );

        if (!$dashboardId) {
            return [
                'success' => false,
                'error' => 'Failed to create personal dashboard',
            ];
        }

        $dashboard = PluginDashboardngDashboard::getDashboardById($dashboardId);

        return [
            'success' => true,
            'data' => $dashboard,
        ];
    }
}
