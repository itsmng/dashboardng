<?php

/**
 * Dashboard NG Plugin - My Dashboard Page
 *
 * Personal technician dashboard view (Coming Soon)
 */

namespace GlpiPlugin\Dashboardng\Pages;

class MyDashboardPage extends AbstractPage
{
    protected string $pageTitle = 'My Dashboard';
    protected string $menuPage = 'mydashboard';
    protected string $requiredRight = 'plugin_dashboardng_mydashboard';
    protected int $rightLevel = UPDATE;

    protected function getTemplate(): string
    {
        return 'pages/mydashboard.twig';
    }

    protected function getTranslations(): array
    {
        return array_merge(parent::getTranslations(), [
            'my_dashboard_coming_soon' => __('My Dashboard - Coming Soon', 'dashboardng'),
            'personal_dashboard_message' => __('This page will show your personal dashboard with tickets assigned to you.', 'dashboardng'),
            'for_now_use_dashboard' => __('For now, please use the main Dashboard page.', 'dashboardng'),
            'go_to_main_dashboard' => __('Go to Main Dashboard', 'dashboardng'),
        ]);
    }
}
