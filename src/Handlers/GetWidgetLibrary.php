<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\PluginDashboardngWidgetDefinition;

/**
 * Handler for getting available widget definitions (library)
 */
class GetWidgetLibrary
{
    public function __invoke(array $params = []): array
    {
        $widgets = PluginDashboardngWidgetDefinition::getAvailableWidgets();

        // Group by visualization type
        $grouped = [
            'card' => [],
            'chart' => [],
            'table' => [],
            'other' => [],
        ];

        foreach ($widgets as $widget) {
            $viz = $widget['visualization'] ?? 'other';
            
            // Map chart subtypes to chart category
            if (in_array($viz, ['bar', 'line', 'pie', 'doughnut'])) {
                $viz = 'chart';
            }
            
            if (!isset($grouped[$viz])) {
                $viz = 'other';
            }
            
            $grouped[$viz][] = $widget;
        }

        return [
            'success' => true,
            'data' => [
                'widgets' => $widgets,
                'grouped' => $grouped,
            ],
        ];
    }
}
