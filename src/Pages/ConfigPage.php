<?php

namespace GlpiPlugin\Dashboardng\Pages;

use GlpiPlugin\Dashboardng\PluginDashboardngConfig;
use Html;
use Session;

class ConfigPage extends AbstractPage
{
    protected string $pageTitle = 'Dashboard NG Configuration';
    protected string $requiredRight = 'plugin_dashboardng_config';
    protected int $rightLevel = UPDATE;
    protected string $menuType = 'config';
    protected string $menuPage = 'config';

    protected function processForm(): void
    {
        if (isset($_POST['update'])) {
            Session::checkCSRF($_POST);

            if (isset($_POST['refresh_interval'])) {
                PluginDashboardngConfig::setGlobal(
                    'refresh_interval',
                    (int)$_POST['refresh_interval']
                );
            }

            if (isset($_POST['default_period'])) {
                PluginDashboardngConfig::setGlobal(
                    'default_period',
                    (int)$_POST['default_period']
                );
            }

            Session::addMessageAfterRedirect(
                __('Configuration saved', 'dashboardng'),
                true,
                INFO
            );
            Html::redirect($_SERVER['REQUEST_URI']);
        }
    }

    protected function initializeData(): array
    {
        $data = parent::initializeData();

        $data['form_action'] = $_SERVER['REQUEST_URI'];
        $data['current_refresh_interval'] = (int)($data['config']['refresh_interval'] ?? 60);
        $data['current_default_period'] = (int)($data['config']['default_period'] ?? 0);
        $data['period_options'] = $this->getPeriodOptions();

        return $data;
    }

    private function getPeriodOptions(): array
    {
        return [
            0 => __('Total', 'dashboardng'),
            1 => __('Current year', 'dashboardng'),
            2 => __('Current month', 'dashboardng'),
            3 => __('Last week', 'dashboardng'),
            4 => __('Last 15 days', 'dashboardng'),
            5 => __('Last 30 days', 'dashboardng'),
            6 => __('Last 90 days', 'dashboardng'),
            7 => __('Last 180 days', 'dashboardng'),
        ];
    }

    protected function getTemplate(): string
    {
        return 'pages/config.twig';
    }

    protected function getTranslations(): array
    {
        return array_merge(parent::getTranslations(), [
            'refresh_interval' => __('Refresh Interval (seconds)', 'dashboardng'),
            'default_period' => __('Default Period', 'dashboardng'),
            'save' => __('Save'),
            'configuration_saved' => __('Configuration saved', 'dashboardng'),
        ]);
    }
}
