<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;

/**
 * Handler for updating widget positions on a dashboard
 */
class UpdateWidgetPositions
{
    public function __invoke(array $params = []): array
    {
        $dashboardId = $params['dashboard_id'] ?? null;
        $positions = $params['positions'] ?? [];

        if (empty($positions)) {
            return [
                'success' => false,
                'error' => 'No positions provided',
            ];
        }

        // If no dashboard specified, use default
        if (!$dashboardId) {
            $dashboard = PluginDashboardngDashboard::getDefaultDashboard();
            $dashboardId = $dashboard['id'] ?? null;
        }

        if (!$dashboardId) {
            return [
                'success' => false,
                'error' => 'Dashboard not found',
            ];
        }

        // Before updating, verify widgets exist for this dashboard
        $existingWidgets = PluginDashboardngDashboardWidget::getWidgetsForDashboard((int) $dashboardId);
        $widgetIds = array_column($existingWidgets, 'id');

        // Check which requested widget IDs actually exist
        $notFound = [];
        $found = [];
        foreach ($positions as $pos) {
            $wid = (int) $pos['id'];
            if (in_array($wid, $widgetIds)) {
                $found[] = $wid;
            } else {
                $notFound[] = $wid;
            }
        }

        $result = PluginDashboardngDashboardWidget::updatePositions(
            (int) $dashboardId,
            $positions
        );

        $response = [
            'success' => $result['success'],
            'data' => [
                'dashboard_id' => $dashboardId,
                'updated' => $result['updated'],
                'skipped' => $result['skipped'],
                'total' => count($positions),
                'debug' => [
                    'found_widget_ids' => $found,
                    'not_found_widget_ids' => $notFound,
                    'existing_widget_ids' => $widgetIds,
                ],
            ],
        ];

        // Include error message if present
        if (isset($result['error'])) {
            $response['error'] = $result['error'];
        }

        return $response;
    }
}
