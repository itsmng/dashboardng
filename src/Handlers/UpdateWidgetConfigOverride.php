<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;
use Session;

class UpdateWidgetConfigOverride
{
    public function __invoke(array $params = []): array
    {
        $placementId = (int) ($params['placement_id'] ?? $params['id'] ?? 0);
        $dashboardId = (int) ($params['dashboard_id'] ?? 0);
        $config = $params['config'] ?? [];

        if ($placementId <= 0 || $dashboardId <= 0) {
            return [
                'success' => false,
                'error' => 'Placement ID and dashboard ID required',
            ];
        }

        $dashboard = PluginDashboardngDashboard::getDashboardById($dashboardId);
        if (!$dashboard) {
            return [
                'success' => false,
                'error' => 'Dashboard not found',
            ];
        }

        $isGlobalDashboard = ((int) $dashboard['users_id'] === 0);
        $userId = Session::getLoginUserID();

        if ($isGlobalDashboard) {
            if (!Session::haveRight('plugin_dashboardng_globaldashboard', UPDATE)) {
                return [
                    'success' => false,
                    'error' => 'Unauthorized',
                ];
            }
        } elseif ((int) $dashboard['users_id'] !== (int) $userId) {
            return [
                'success' => false,
                'error' => 'Unauthorized',
            ];
        }

        $updated = PluginDashboardngDashboardWidget::updateConfigOverride(
            $placementId,
            $dashboardId,
            $config
        );

        if (!$updated) {
            return [
                'success' => false,
                'error' => 'Failed to update widget configuration',
            ];
        }

        return [
            'success' => true,
            'data' => [
                'placement_id' => $placementId,
            ],
        ];
    }
}
