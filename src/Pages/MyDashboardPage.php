<?php
namespace GlpiPlugin\Dashboardng\Pages;

use Session;

class MyDashboardPage extends AbstractPage
{
    protected string $pageTitle = 'My Dashboard';
    protected string $menuPage = 'mydashboard';
    protected string $requiredRight = 'plugin_dashboardng_mydashboard';
    protected int $rightLevel = UPDATE;

    protected function initializeData(): array
    {
        $data = parent::initializeData();

        $config = $data['config'];
        $data['refresh_interval'] = (int)($config['refresh_interval'] ?? 60);
        $data['default_period'] = (int)($config['period'] ?? $config['default_period'] ?? 0);
        $data['can_edit_global_dashboard'] = Session::haveRight('plugin_dashboardng_globaldashboard', UPDATE);
        $data['page_mode'] = 'personal';

        return $data;
    }

    protected function getTemplate(): string
    {
        return 'pages/mydashboard.twig';
    }
}
