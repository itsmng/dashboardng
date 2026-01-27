<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use Session;

class SetDefaultDashboard
{
    public function __invoke(array $params = []): array
    {
        if (!Session::haveRight('plugin_dashboardng_mydashboard', UPDATE)) {
            return [
                'success' => false,
                'error' => 'Unauthorized',
            ];
        }

        $dashboardId = (int) ($params['dashboard_id'] ?? 0);
        if ($dashboardId <= 0) {
            return [
                'success' => false,
                'error' => 'Dashboard ID required',
            ];
        }

        $success = PluginDashboardngDashboard::setDefaultDashboardForUser($dashboardId);
        if (!$success) {
            return [
                'success' => false,
                'error' => 'Dashboard not found or not accessible',
            ];
        }

        $dashboard = PluginDashboardngDashboard::getDashboardById($dashboardId);

        return [
            'success' => true,
            'data' => [
                'dashboard' => $dashboard,
            ],
        ];
    }
}
