<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;
use Session;

class DeleteDashboard
{
    public function __invoke(array $params = []): array
    {
        $dashboardId = (int) ($params['id'] ?? 0);
        if ($dashboardId <= 0) {
            return [
                'success' => false,
                'error' => 'Dashboard ID required',
            ];
        }

        $dashboard = PluginDashboardngDashboard::getDashboardById($dashboardId);
        if (!$dashboard) {
            return [
                'success' => false,
                'error' => 'Dashboard not found',
            ];
        }

        $isGlobal = (int) $dashboard['users_id'] === 0;
        $userId = Session::getLoginUserID();

        if ($isGlobal) {
            if (!Session::haveRight('plugin_dashboardng_globaldashboard', UPDATE)) {
                return [
                    'success' => false,
                    'error' => 'Unauthorized',
                ];
            }
        } else {
            if (!Session::haveRight('plugin_dashboardng_mydashboard', UPDATE)) {
                return [
                    'success' => false,
                    'error' => 'Unauthorized',
                ];
            }

            if ($userId !== false && $userId > 0 && (int) $dashboard['users_id'] !== (int) $userId) {
                return [
                    'success' => false,
                    'error' => 'Unauthorized',
                ];
            }
        }

        $success = PluginDashboardngDashboard::deleteDashboard($dashboardId);
        if (!$success) {
            return [
                'success' => false,
                'error' => 'Failed to delete dashboard',
            ];
        }

        return [
            'success' => true,
            'data' => [
                'id' => $dashboardId,
            ],
        ];
    }
}
