<?php

namespace GlpiPlugin\Dashboardng\Pages;

use Session;

class DashboardPage extends AbstractPage
{
    protected string $pageTitle = 'Dashboard NG';
    protected string $menuPage = 'dashboard';

    protected function initializeData(): array
    {
        $data = parent::initializeData();

        $config = $data['config'];
        $data['refresh_interval'] = (int)($config['refresh_interval'] ?? 60);
        $data['default_period'] = (int)($config['period'] ?? $config['default_period'] ?? 0);
        $data['can_edit_global_dashboard'] = Session::haveRight('plugin_dashboardng_globaldashboard', UPDATE);

        return $data;
    }

    protected function getTemplate(): string
    {
        return 'pages/dashboard.twig';
    }
}
