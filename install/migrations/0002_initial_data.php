<?php

final class PluginDashboardngMigration0002InitialData extends \GlpiPlugin\Dashboardng\Migration\AbstractDashboardngMigration
{
    public const VERSION = '0002';

    public function upgrade(\Migration $migration): void
    {
        $this->insertGlobalConfigs();
        $this->insertDefaultDashboard();
        $this->insertDefaultWidgets();
        $this->populateDefaultDashboardWidgets();

        $migration->executeMigration();
    }

    private function insertGlobalConfigs(): void
    {
        global $DB;

        $table = 'glpi_plugin_dashboardng_config';

        $configs = [
            ['users_id' => 0, 'name' => 'refresh_interval', 'value' => '60'],
            ['users_id' => 0, 'name' => 'default_period', 'value' => '0'],
            ['users_id' => 0, 'name' => 'theme', 'value' => 'default'],
            ['users_id' => 0, 'name' => 'query_default_limit', 'value' => '1000'],
            ['users_id' => 0, 'name' => 'query_max_limit', 'value' => '10000'],
            ['users_id' => 0, 'name' => 'query_timeout', 'value' => '30'],
        ];

        foreach ($configs as $config) {
            $DB->insert($table, $config);
        }
    }

    private function insertDefaultDashboard(): void
    {
        global $DB;

        $table = 'glpi_plugin_dashboardng_dashboards';

        $config = json_encode([
            'refreshInterval' => 60000,
            'columnCount' => 12,
        ], JSON_UNESCAPED_UNICODE);

        $DB->insert($table, [
            'name' => 'Global Dashboard',
            'users_id' => 0,
            'is_default' => 1,
            'is_active' => 1,
            'config' => $config,
        ]);
    }

    private function insertDefaultWidgets(): void
    {
        global $DB;

        $table = 'glpi_plugin_dashboardng_widget_definitions';

        $widgets = $this->getDefaultWidgetDefinitions();

        foreach ($widgets as $widget) {
            $widget['config'] = json_encode($widget['config'], JSON_UNESCAPED_UNICODE);
            $widget['users_id'] = 0;

            $DB->insert($table, $widget);
        }
    }

    private function getDefaultWidgetDefinitions(): array
    {
        $currentYear = (int) date('Y');
        $ticketEvolutionSeries = [];

        for ($index = 0; $index < 3; $index += 1) {
            $year = $currentYear - $index;
            $rangeStart = $year . '-01-01';
            $rangeEnd = $year . '-12-31';

            $ticketEvolutionSeries[] = [
                'name' => (string) $year,
                'range_key' => "yoy-$year",
                'range_start' => $rangeStart,
                'range_end' => $rangeEnd,
                'filters' => [[
                    'field' => 15,
                    'operator' => 'between',
                    'value' => [$rangeStart, $rangeEnd],
                ]],
                'filter_mode' => 'append',
                'color' => ''
            ];
        }

        return [
            [
                'name' => __('Tickets Daily', 'dashboardng'),
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'Ticket',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => __('Tickets Daily', 'dashboardng'),
                    'itemtype' => 'Ticket',
                    'visualization' => 'card',
                    'icon' => 'fas fa-calendar-day',
                    'color' => '#ffc107',
                    'filters' => [
                        ['field' => 15, 'searchtype' => 'equals', 'value' => '$$TODAY$$']
                    ],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => __('Monthly Tickets', 'dashboardng'),
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'Ticket',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => __('Monthly Tickets', 'dashboardng'),
                    'itemtype' => 'Ticket',
                    'visualization' => 'card',
                    'icon' => 'fas fa-calendar-alt',
                    'color' => '#198754',
                    'filters' => [
                        ['field' => 15, 'searchtype' => 'morethan', 'value' => '$$THISMONTH$$']
                    ],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => __('Late Tickets', 'dashboardng'),
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'Ticket',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => __('Late Tickets', 'dashboardng'),
                    'itemtype' => 'Ticket',
                    'visualization' => 'card',
                    'icon' => 'fas fa-exclamation-triangle',
                    'color' => '#dc3545',
                    'filters' => [
                        ['field' => 12, 'searchtype' => 'notequals', 'value' => '6'],
                        ['field' => 82, 'searchtype' => 'lessthan', 'value' => '$$NOW$$']
                    ],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => __('Backlog', 'dashboardng'),
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'Ticket',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => __('Backlog', 'dashboardng'),
                    'itemtype' => 'Ticket',
                    'visualization' => 'card',
                    'icon' => 'fas fa-tag',
                    'color' => '#795548',
                    'filters' => [
                        ['field' => 12, 'searchtype' => 'notequals', 'value' => '6'],
                        ['field' => 5, 'searchtype' => 'empty', 'value' => '']
                    ],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => __('Total Tickets', 'dashboardng'),
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'Ticket',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => __('Total Tickets', 'dashboardng'),
                    'itemtype' => 'Ticket',
                    'visualization' => 'card',
                    'icon' => 'fas fa-plus-square',
                    'color' => '#6f42c1',
                    'filters' => [],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => __('Users', 'dashboardng'),
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'User',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => __('Users', 'dashboardng'),
                    'itemtype' => 'User',
                    'visualization' => 'card',
                    'icon' => 'fas fa-users',
                    'color' => '#fd7e14',
                    'filters' => [],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => __('Tickets by Status', 'dashboardng'),
                'widget_type' => 'custom',
                'visualization' => 'chart',
                'itemtype' => 'Ticket',
                'default_width' => 6,
                'default_height' => 4,
                'config' => [
                    'title' => __('Tickets by Status (Open)', 'dashboardng'),
                    'itemtype' => 'Ticket',
                    'visualization' => 'chart',
                    'chartType' => 'doughnut',
                    'filters' => [
                        ['field' => 12, 'searchtype' => 'notequals', 'value' => '6'],
                        ['field' => 12, 'searchtype' => 'notequals', 'value' => '5'],
                    ],
                    'groupBy' => ['field' => 12],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => __('Ticket Evolution', 'dashboardng'),
                'widget_type' => 'custom',
                'visualization' => 'chart',
                'itemtype' => 'Ticket',
                'default_width' => 6,
                'default_height' => 4,
                'config' => [
                    'title' => __('Ticket Evolution (Year-over-Year)', 'dashboardng'),
                    'itemtype' => 'Ticket',
                    'visualization' => 'chart',
                    'chartType' => 'line',
                    'filters' => [],
                    'groupBy' => ['field' => 15, 'interval' => 'month'],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'seriesMode' => 'time',
                    'seriesPreset' => 'yoy',
                    'seriesCount' => 3,
                    'series' => $ticketEvolutionSeries,
                    'refreshInterval' => 300000
                ]
            ],
            [
                'name' => __('Tickets - Last 7 Days', 'dashboardng'),
                'widget_type' => 'custom',
                'visualization' => 'chart',
                'itemtype' => 'Ticket',
                'default_width' => 6,
                'default_height' => 4,
                'config' => [
                    'title' => __('Tickets - Last 7 Days', 'dashboardng'),
                    'itemtype' => 'Ticket',
                    'visualization' => 'chart',
                    'chartType' => 'line',
                    'filters' => [
                        ['field' => 15, 'searchtype' => 'greater_than', 'value' => '$$TODAY-7DAY$$']
                    ],
                    'groupBy' => ['field' => 15, 'interval' => 'day'],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 300000
                ]
            ],
            [
                'name' => __('Tickets by Priority', 'dashboardng'),
                'widget_type' => 'custom',
                'visualization' => 'chart',
                'itemtype' => 'Ticket',
                'default_width' => 6,
                'default_height' => 4,
                'config' => [
                    'title' => __('Tickets by Priority', 'dashboardng'),
                    'itemtype' => 'Ticket',
                    'visualization' => 'chart',
                    'chartType' => 'bar',
                    'filters' => [
                        ['field' => 15, 'searchtype' => 'greater_than', 'value' => '$$THISMONTH$$']
                    ],
                    'groupBy' => ['field' => 3],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => __('My Assigned Tickets', 'dashboardng'),
                'widget_type' => 'custom',
                'visualization' => 'table',
                'itemtype' => 'Ticket',
                'default_width' => 6,
                'default_height' => 4,
                'config' => [
                    'title' => __('My Assigned Tickets', 'dashboardng'),
                    'itemtype' => 'Ticket',
                    'visualization' => 'table',
                    'filters' => [
                        ['field' => 5, 'searchtype' => 'equals', 'value' => '$$MYSELF$$'],
                        ['field' => 12, 'searchtype' => 'equals', 'value' => 'notclosed']
                    ],
                    'outputFields' => [2, 1, 12, 3],
                    'sortBy' => ['field' => 3, 'direction' => 'DESC'],
                    'limit' => 10,
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => __('Recent Tickets', 'dashboardng'),
                'widget_type' => 'custom',
                'visualization' => 'table',
                'itemtype' => 'Ticket',
                'default_width' => 6,
                'default_height' => 4,
                'config' => [
                    'title' => __('Recent Tickets', 'dashboardng'),
                    'itemtype' => 'Ticket',
                    'visualization' => 'table',
                    'filters' => [
                        ['field' => 12, 'searchtype' => 'equals', 'value' => 'notclosed']
                    ],
                    'outputFields' => [2, 1, 12, 3, 15],
                    'sortBy' => ['field' => 15, 'direction' => 'DESC'],
                    'limit' => 10,
                    'refreshInterval' => 60000
                ]
            ],
        ];
    }

    private function populateDefaultDashboardWidgets(): void
    {
        global $DB;

        $widgetTable = 'glpi_plugin_dashboardng_widget_definitions';
        $dashboardTable = 'glpi_plugin_dashboardng_dashboards';
        $placementTable = 'glpi_plugin_dashboardng_dashboard_widgets';

        $dashboardId = 0;

        foreach ($DB->request([
            'SELECT' => 'id',
            'FROM' => $dashboardTable,
            'WHERE' => [
                'name' => 'Global Dashboard',
                'is_default' => 1,
            ],
            'LIMIT' => 1,
        ]) as $row) {
            $dashboardId = (int) $row['id'];
        }

        if ($dashboardId === 0) {
            return;
        }

        $widgets = [];
        foreach ($DB->request([
            'FROM' => $widgetTable,
            'WHERE' => ['users_id' => 0],
            'ORDER' => 'id',
        ]) as $row) {
            $widgets[] = [
                'id' => (int) $row['id'],
                'name' => $row['name'],
                'default_width' => (int) $row['default_width'],
                'default_height' => (int) $row['default_height'],
            ];
        }

        $customLayout = [
            0 => ['x' => 0, 'y' => 0, 'width' => 2, 'height' => 2],
            1 => ['x' => 2, 'y' => 0, 'width' => 2, 'height' => 2],
            2 => ['x' => 4, 'y' => 0, 'width' => 2, 'height' => 2],
            3 => ['x' => 6, 'y' => 0, 'width' => 2, 'height' => 2],
            4 => ['x' => 8, 'y' => 0, 'width' => 2, 'height' => 2],
            5 => ['x' => 10, 'y' => 0, 'width' => 2, 'height' => 2],
            6 => ['x' => 0, 'y' => 2, 'width' => 6, 'height' => 4],
            7 => ['x' => 6, 'y' => 2, 'width' => 6, 'height' => 4],
            8 => ['x' => 0, 'y' => 6, 'width' => 6, 'height' => 4],
            9 => ['x' => 6, 'y' => 6, 'width' => 6, 'height' => 4],
            10 => ['x' => 0, 'y' => 10, 'width' => 6, 'height' => 4],
            11 => ['x' => 6, 'y' => 10, 'width' => 6, 'height' => 4],
        ];

        $positionIndex = 0;
        foreach ($widgets as $index => $widget) {
            $widgetId = $widget['id'];

            if (isset($customLayout[$index])) {
                $position = $customLayout[$index];
            } else {
                $position = ['x' => 0, 'y' => 14 + ($positionIndex * 4)];
            }

            $position['width'] = $position['width'] ?? $widget['default_width'];
            $position['height'] = $position['height'] ?? $widget['default_height'];

            $DB->insert($placementTable, [
                'dashboards_id' => $dashboardId,
                'widget_definitions_id' => $widgetId,
                'x' => $position['x'],
                'y' => $position['y'],
                'width' => $position['width'],
                'height' => $position['height'],
                'is_visible' => 1,
                'position' => $positionIndex,
            ]);

            $positionIndex++;
        }
    }
}
