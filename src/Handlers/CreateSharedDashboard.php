<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use Session;

class CreateSharedDashboard
{
    public function __invoke(array $params): array
    {
        if (!Session::haveRight('plugin_dashboardng_globaldashboard', UPDATE)) {
            http_response_code(403);
            return [
                'success' => false,
                'error' => 'Permission denied'
            ];
        }

        $name = $params['name'] ?? 'Shared Dashboard';
        $sourceDashboardId = (int) ($params['source_dashboard_id'] ?? 0);

        $dashboardId = PluginDashboardngDashboard::createSharedDashboard($sourceDashboardId, $name);

        if ($dashboardId) {
            $dashboard = PluginDashboardngDashboard::getDashboardById($dashboardId);
            return [
                'success' => true,
                'dashboard' => $dashboard
            ];
        }

        return [
            'success' => false,
            'error' => 'Failed to create shared dashboard'
        ];
    }
}
