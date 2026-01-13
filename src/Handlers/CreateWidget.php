<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngWidgetDefinition;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;

/**
 * Handler for creating a new custom widget definition
 * and optionally adding it to a dashboard
 */
class CreateWidget
{
    public function __invoke(array $params = []): array
    {
        $config = $params['config'] ?? [];
        $dashboardId = $params['dashboard_id'] ?? null;
        $addToDashboard = $params['add_to_dashboard'] ?? true;

        if (empty($config)) {
            return [
                'success' => false,
                'error' => 'Widget configuration required',
            ];
        }

        // Create widget definition
        $widgetId = PluginDashboardngWidgetDefinition::createWidget([
            'name' => $config['title'] ?? 'New Widget',
            'config' => $config,
            'width' => $params['width'] ?? 4,
            'height' => $params['height'] ?? 4,
        ]);

        if (!$widgetId) {
            return [
                'success' => false,
                'error' => 'Failed to create widget',
            ];
        }

        $result = [
            'success' => true,
            'data' => [
                'widget_id' => $widgetId,
            ],
        ];

        // Optionally add to dashboard
        if ($addToDashboard) {
            if (!$dashboardId) {
                $dashboard = PluginDashboardngDashboard::getDefaultDashboard();
                
                // If global, create personal first
                if ($dashboard && $dashboard['users_id'] == 0) {
                    $dashboardId = PluginDashboardngDashboard::createPersonalDashboard(
                        $dashboard['id'],
                        'My Dashboard'
                    );
                } else {
                    $dashboardId = $dashboard['id'] ?? null;
                }
            }

            if ($dashboardId) {
                $placementId = PluginDashboardngDashboardWidget::addWidgetToDashboard(
                    (int) $dashboardId,
                    $widgetId,
                    [
                        'x' => $params['x'] ?? 0,
                        'y' => $params['y'] ?? null,
                        'width' => $params['width'] ?? 4,
                        'height' => $params['height'] ?? 4,
                    ]
                );

                $result['data']['placement_id'] = $placementId;
                $result['data']['dashboard_id'] = $dashboardId;
            }
        }

        return $result;
    }
}
