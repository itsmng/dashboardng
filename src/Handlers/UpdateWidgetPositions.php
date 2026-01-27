<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;
use Session;

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
            ],
        ];

        // Include error message if present
        if (isset($result['error'])) {
            $response['error'] = $result['error'];
        }

        return $response;
    }
}
