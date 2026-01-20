<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;
use Session;

/**
 * Handler for getting widgets for a dashboard
 * 
 * If no dashboard specified, returns widgets for user's default dashboard.
 * If user has no personal dashboard, shows global dashboard.
 */
class GetDashboardWidgets
{
    public function __invoke(array $params = []): array
    {
        $dashboardId = $params['dashboard_id'] ?? null;

        // Get dashboard
        if ($dashboardId) {
            $dashboard = PluginDashboardngDashboard::getDashboardById((int) $dashboardId);
        } else {
            $dashboard = PluginDashboardngDashboard::getDefaultDashboard();
        }

        if (!$dashboard) {
            return [
                'success' => false,
                'error' => 'Dashboard not found',
            ];
        }

        // Get widgets for this dashboard
        $widgets = PluginDashboardngDashboardWidget::getWidgetsForDashboard($dashboard['id']);

        // Determine edit permissions
        $isGlobalDashboard = $dashboard['users_id'] == 0;
        $isPersonalDashboard = $dashboard['users_id'] == Session::getLoginUserID();

        // Can edit if it's a personal dashboard (owned by user) OR global dashboard and user has global edit right
        $canEdit = $isPersonalDashboard || ($isGlobalDashboard && Session::haveRight('plugin_dashboardng_globaldashboard', UPDATE));
        $canEditGlobal = $isGlobalDashboard && Session::haveRight('plugin_dashboardng_globaldashboard', UPDATE);

        return [
            'success' => true,
            'data' => [
                'dashboard' => $dashboard,
                'widgets' => $widgets,
                'can_edit' => $canEdit,
                'can_edit_global' => $canEditGlobal,
                'is_personal' => $isPersonalDashboard,
                'is_global' => $isGlobalDashboard,
            ],
        ];
    }


}
