<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;
use Session;

/**
 * Handler for adding a widget to a dashboard
 */
class AddWidgetToDashboard
{
    public function __invoke(array $params = []): array
    {
        $dashboardId = $params['dashboard_id'] ?? null;
        $widgetDefinitionId = $params['widget_definition_id'] ?? null;

        if (!$widgetDefinitionId) {
            return [
                'success' => false,
                'error' => 'Widget definition ID required',
            ];
        }

        // If no dashboard specified, use default or create personal
        if (!$dashboardId) {
            $dashboard = PluginDashboardngDashboard::getDefaultDashboard();

            // If global dashboard, create personal copy first
            if ($dashboard && $dashboard['users_id'] == 0) {
                if (!Session::haveRight('plugin_dashboardng_mydashboard', UPDATE)) {
                    return [
                        'success' => false,
                        'error' => 'Unauthorized',
                    ];
                }

                $newDashboardId = PluginDashboardngDashboard::createPersonalDashboard(
                    $dashboard['id'],
                    'My Dashboard'
                );
                if ($newDashboardId) {
                    $dashboardId = $newDashboardId;
                } else {
                    return [
                        'success' => false,
                        'error' => 'Failed to create personal dashboard',
                    ];
                }
            } else {
                $dashboardId = $dashboard['id'];
            }
        }

        // Get dashboard to check if it's global
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

        // Add widget to dashboard
        $position = [
            'x' => $params['x'] ?? 0,
            'y' => $params['y'] ?? null,
            'width' => $params['width'] ?? null,
            'height' => $params['height'] ?? null,
        ];

        $placementId = PluginDashboardngDashboardWidget::addWidgetToDashboard(
            (int) $dashboardId,
            (int) $widgetDefinitionId,
            array_filter($position, fn($v) => $v !== null)
        );

        if (!$placementId) {
            return [
                'success' => false,
                'error' => 'Failed to add widget',
            ];
        }

        // Return updated widget list
        $widgets = PluginDashboardngDashboardWidget::getWidgetsForDashboard((int) $dashboardId);

        return [
            'success' => true,
            'data' => [
                'placement_id' => $placementId,
                'dashboard_id' => $dashboardId,
                'widgets' => $widgets,
            ],
        ];
    }
}
