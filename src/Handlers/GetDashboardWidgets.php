<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;
use GlpiPlugin\Dashboardng\PluginDashboardngWidgetDefinition;
use Session;

/**
 * Handler for getting widgets for a dashboard
 * 
 * If no dashboard specified, returns widgets for user's default dashboard.
 * If user has no personal dashboard, shows global dashboard.
 * Creates default dashboard and widgets if none exist.
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

        // If no dashboard exists, create the default global dashboard
        if (!$dashboard) {
            $initDebug = $this->initializeDefaultDashboard();
            $dashboard = PluginDashboardngDashboard::getDefaultDashboard();
        }

        if (!$dashboard) {
            return [
                'success' => false,
                'error' => 'Dashboard not found and could not be created',
                'debug' => $initDebug ?? null,
            ];
        }

        // Get widgets for this dashboard
        $widgets = PluginDashboardngDashboardWidget::getWidgetsForDashboard($dashboard['id']);

        // If dashboard has no widgets and it's the global default, populate it
        if (empty($widgets) && $dashboard['is_default'] && $dashboard['users_id'] == 0) {
            PluginDashboardngDashboardWidget::populateDefaultWidgets($dashboard['id']);
            $widgets = PluginDashboardngDashboardWidget::getWidgetsForDashboard($dashboard['id']);
        }

        return [
            'success' => true,
            'data' => [
                'dashboard' => $dashboard,
                'widgets' => $widgets,
                'can_edit' => $dashboard['users_id'] == Session::getLoginUserID() || $dashboard['users_id'] == 0,
                'is_personal' => $dashboard['users_id'] == Session::getLoginUserID(),
            ],
        ];
    }

    /**
     * Initialize default dashboard and widget definitions if they don't exist
     * 
     * @return array Debug info about what was created
     */
    private function initializeDefaultDashboard(): array
    {
        global $DB;
        
        $debug = ['steps' => []];
        
        // Ensure tables exist first
        $dashboardTable = PluginDashboardngDashboard::getTable();
        $widgetDefTable = PluginDashboardngWidgetDefinition::getTable();
        $dashboardWidgetTable = PluginDashboardngDashboardWidget::getTable();
        
        if (!$DB->tableExists($dashboardTable)) {
            PluginDashboardngDashboard::install();
            $debug['steps'][] = 'Created dashboard table';
        }
        if (!$DB->tableExists($widgetDefTable)) {
            PluginDashboardngWidgetDefinition::install();
            $debug['steps'][] = 'Created widget definitions table';
        }
        if (!$DB->tableExists($dashboardWidgetTable)) {
            PluginDashboardngDashboardWidget::install();
            $debug['steps'][] = 'Created dashboard-widget table';
        }

        // Verify tables exist now
        $debug['tables'] = [
            'dashboards' => $DB->tableExists($dashboardTable),
            'widget_definitions' => $DB->tableExists($widgetDefTable),
            'dashboard_widgets' => $DB->tableExists($dashboardWidgetTable),
        ];

        // Create default widget definitions if none exist
        $widgets = PluginDashboardngWidgetDefinition::getAvailableWidgets();
        if (empty($widgets)) {
            $widgetIds = PluginDashboardngWidgetDefinition::createDefaultWidgets();
            $debug['steps'][] = 'Created ' . count($widgetIds) . ' default widgets';
        }
        $debug['widget_count'] = count(PluginDashboardngWidgetDefinition::getAvailableWidgets());

        // Create default global dashboard
        $dashboardId = PluginDashboardngDashboard::createDefaultDashboard();
        $debug['dashboard_id'] = $dashboardId;
        if ($dashboardId) {
            $debug['steps'][] = 'Created/found default dashboard ID: ' . $dashboardId;
        } else {
            $debug['steps'][] = 'Failed to create default dashboard';
        }

        return $debug;
    }
}
