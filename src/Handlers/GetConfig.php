<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngConfig;

class GetConfig
{
    public function handle(): array
    {
        return [
            'success' => true,
            'data' => [
                'config' => PluginDashboardngConfig::getAll(),
            ],
            'timestamp' => time(),
        ];
    }
}
