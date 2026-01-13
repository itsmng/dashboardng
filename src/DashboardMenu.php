<?php

namespace GlpiPlugin\Dashboardng;

use CommonDBTM;
use Session;

/**
 * Dashboard Menu - Integrates with GLPI's menu system
 */
class DashboardMenu extends CommonDBTM
{
    /**
     * Get the menu content for the Dashboard NG plugin
     *
     * @return array Menu configuration
     */
    public static function getMenuContent(): array
    {
        $menu = [
            'title' => __('Dashboard NG', 'dashboardng'),
            'icon'  => 'fas fa-chart-line',
            'page'  => '/plugins/dashboardng/front/dashboard.php',
        ];

        // Add sub-menu items
        if (Session::haveRight('ticket', READ)) {
            $menu['options']['dashboard'] = [
                'title' => __('Dashboard', 'dashboardng'),
                'icon'  => 'fas fa-tachometer-alt',
                'page'  => '/plugins/dashboardng/front/dashboard.php',
            ];
            
            $menu['options']['reports'] = [
                'title' => __('Reports', 'dashboardng'),
                'icon'  => 'fas fa-file-alt',
                'page'  => '/plugins/dashboardng/front/reports.php',
            ];
        }

        // Add config menu for admins
        if (Session::haveRight('config', UPDATE)) {
            $menu['options']['config'] = [
                'title' => __('Configuration', 'dashboardng'),
                'icon'  => 'fas fa-cog',
                'page'  => '/plugins/dashboardng/front/config.form.php',
            ];
        }

        return $menu;
    }
}
