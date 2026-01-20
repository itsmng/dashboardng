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

        // If no dashboard specified, try to get from placement
        if (!$dashboardId) {
            $dashboard = PluginDashboardngDashboard::getDefaultDashboard();
            if (!$dashboard) {
                return [
                    'success' => false,
                    'error' => 'Dashboard not found',
                ];
            }

            // If it's a global dashboard, check global edit right
            if ($dashboard['users_id'] == 0) {
                if (!Session::haveRight('plugin_dashboardng_globaldashboard', UPDATE)) {
                    return [
                        'success' => false,
                        'error' => 'Unauthorized',
                    ];
                }
                $dashboardId = $dashboard['id'];
            } elseif ($dashboard['users_id'] == Session::getLoginUserID()) {
                // It's user's personal dashboard, allow
                $dashboardId = $dashboard['id'];
            } else {
                return [
                    'success' => false,
                    'error' => 'Cannot remove widgets from this dashboard.',
                ];
            }
        }

        // Get dashboard to check permissions
        $dashboard = PluginDashboardngDashboard::getDashboardById((int) $dashboardId);
        if (!$dashboard) {
            return [
                'success' => false,
                'error' => 'Dashboard not found',
            ];
        }

        // Check global dashboard edit right
        if ($dashboard['users_id'] == 0 && !Session::haveRight('plugin_dashboardng_globaldashboard', UPDATE)) {
            return [
                'success' => false,
                'error' => 'Unauthorized',
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
