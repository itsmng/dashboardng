<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;
use Session;

/**
 * Handler for getting widgets for the global dashboard
 * 
 * Always returns the global dashboard (users_id=0), never a personal dashboard.
 */
class GetGlobalDashboardWidgets
{
    public function __invoke(): array
    {
        // Get global dashboard only
        $dashboard = PluginDashboardngDashboard::getGlobalDashboard();

        if (!$dashboard) {
            return [
                'success' => false,
                'error' => 'Global dashboard not found',
            ];
        }

        // Get widgets for this dashboard
        $widgets = PluginDashboardngDashboardWidget::getWidgetsForDashboard($dashboard['id']);

        // Determine edit permissions
        $isGlobalDashboard = $dashboard['users_id'] == 0;
        $isPersonalDashboard = $dashboard['users_id'] == Session::getLoginUserID();

        // Can edit if user has global edit right
        $canEdit = $isGlobalDashboard && Session::haveRight('plugin_dashboardng_globaldashboard', UPDATE);
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
                'can_view_widgets' => Session::haveRight('plugin_dashboardng_widgets', READ),
                'can_update_widgets' => Session::haveRight('plugin_dashboardng_widgets', UPDATE),
                'can_create_widgets' => Session::haveRight('plugin_dashboardng_widgets', CREATE),
            ],
        ];
    }

}
