<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;
use Session;

/**
 * Handler for removing a widget from a dashboard
 */
class RemoveWidgetFromDashboard
{
    public function __invoke(array $params = []): array
    {
        $placementId = $params['placement_id'] ?? $params['id'] ?? null;
        $dashboardId = $params['dashboard_id'] ?? null;
        
        if (!$placementId) {
            return [
                'success' => false,
                'error' => 'Widget placement ID required',
            ];
        }

        // If no dashboard specified, try to get from the placement
        if (!$dashboardId) {
            // Get user's default dashboard
            $dashboard = PluginDashboardngDashboard::getDefaultDashboard();
            if ($dashboard && $dashboard['users_id'] == Session::getLoginUserID()) {
                $dashboardId = $dashboard['id'];
            } else {
                return [
                    'success' => false,
                    'error' => 'Cannot remove widgets from global dashboard directly. Create a personal dashboard first.',
                ];
            }
        }

        // Verify this is a personal dashboard
        $dashboard = PluginDashboardngDashboard::getDashboardById((int) $dashboardId);
        if (!$dashboard || $dashboard['users_id'] == 0) {
            return [
                'success' => false,
                'error' => 'Cannot modify global dashboards',
            ];
        }

        $success = PluginDashboardngDashboardWidget::removeWidgetFromDashboard(
            (int) $placementId,
            (int) $dashboardId
        );

        if (!$success) {
            return [
                'success' => false,
                'error' => 'Failed to remove widget',
            ];
        }

        return [
            'success' => true,
            'data' => [
                'removed_id' => $placementId,
            ],
        ];
    }
}
