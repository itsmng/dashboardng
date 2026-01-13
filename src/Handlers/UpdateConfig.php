<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngConfig;

class UpdateConfig
{
    public function handle(array $input): array
    {
        $errors = [];

        if (!empty($input['config'])) {
            $allowedKeys = [
                'entity',
                'period',
                'refresh_interval',
                'theme',
            ];

            foreach ($input['config'] as $key => $value) {
                if (in_array($key, $allowedKeys)) {
                    if (!PluginDashboardngConfig::set($key, $value)) {
                        $errors[] = "Failed to update config: $key";
                    }
                }
            }
        }

        return [
            'success' => empty($errors),
            'errors'  => $errors,
            'timestamp' => time(),
        ];
    }
}
