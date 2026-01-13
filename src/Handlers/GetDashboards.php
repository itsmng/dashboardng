<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;

/**
 * Handler for getting available dashboards
 */
class GetDashboards
{
    public function __invoke(array $params = []): array
    {
        $dashboards = PluginDashboardngDashboard::getAvailableDashboards();

        return [
            'success' => true,
            'data' => $dashboards,
        ];
    }
}
