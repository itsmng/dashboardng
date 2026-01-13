<?php

namespace GlpiPlugin\Dashboardng\Pages;

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

        return $data;
    }

    protected function getTemplate(): string
    {
        return 'pages/dashboard.twig';
    }

    // Translations now handled by __() function in JavaScript
    // The getTranslations() method is no longer needed
}
