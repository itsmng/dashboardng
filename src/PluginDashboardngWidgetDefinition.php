<?php

namespace GlpiPlugin\Dashboardng;

use CommonDBTM;
use Session;

/**
 * Widget Definition - Stores what a widget displays
 * 
 * This is the actual widget configuration (data source, visualization, filters, etc.)
 * Widgets can be:
 * - Global (users_id = 0): Available to all users to add to their dashboards
 * - User-specific (users_id > 0): Created by user
 */
class PluginDashboardngWidgetDefinition extends CommonDBTM
{
    public static $rightname = 'plugin_dashboardng_widget';

    public static function getTable($classname = null): string
    {
        return 'glpi_plugin_dashboardng_widget_definitions';
    }

    /**
     * Install database table
     *
     * @return boolean
     */
    public static function install(): bool
    {
        global $DB;

        $table = self::getTable();

        if (!$DB->tableExists($table)) {
            $query = <<<SQL
                CREATE TABLE `$table` (
                    `id` INT(11) NOT NULL AUTO_INCREMENT,
                    `name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
                    `users_id` INT(11) NOT NULL DEFAULT 0 COMMENT '0 = global widget',
                    `widget_type` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'custom',
                    `visualization` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'card',
                    `itemtype` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                    `config` JSON NOT NULL COMMENT 'Full widget configuration',
                    `default_width` INT(11) NOT NULL DEFAULT 4,
                    `default_height` INT(11) NOT NULL DEFAULT 4,
                    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                    `date_creation` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `date_mod` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    KEY `users_id` (`users_id`),
                    KEY `widget_type` (`widget_type`),
                    KEY `visualization` (`visualization`),
                    KEY `itemtype` (`itemtype`),
                    KEY `is_active` (`is_active`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            SQL;

            $DB->queryOrDie($query, $DB->error());

            // Create default widgets
            self::createDefaultWidgets();
        }

        return true;
    }

    /**
     * Uninstall database table
     *
     * @return boolean
     */
    public static function uninstall(): bool
    {
        global $DB;

        $table = self::getTable();

        if ($DB->tableExists($table)) {
            $DB->queryOrDie("DROP TABLE `$table`", $DB->error());
        }

        return true;
    }

    /**
     * Create default global widgets (idempotent)
     */
    public static function createDefaultWidgets(): array
    {
        global $DB;

        $table = self::getTable();
        
        // Check if default widgets already exist
        $existingCount = $DB->request([
            'COUNT' => 'cpt',
            'FROM' => $table,
            'WHERE' => [
                'users_id' => 0,
            ],
        ]);
        
        if ($existingCount->current()['cpt'] > 0) {
            // Return existing widget IDs
            $result = $DB->request([
                'SELECT' => 'id',
                'FROM' => $table,
                'WHERE' => ['users_id' => 0],
            ]);
            $widgets = [];
            foreach ($result as $row) {
                $widgets[] = (int) $row['id'];
            }
            return $widgets;
        }

        $widgets = [];

        $defaultWidgets = [
            // KPI Cards
            [
                'name' => "Today's Tickets",
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'Ticket',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => "Today's Tickets",
                    'itemtype' => 'Ticket',
                    'visualization' => 'card',
                    'icon' => 'fas fa-calendar-day',
                    'color' => '#0d6efd',
                    'filters' => [
                        ['field' => 15, 'searchtype' => 'morethan', 'value' => '$$TODAY-1DAY$$']
                    ],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => 'Monthly Tickets',
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'Ticket',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => 'Monthly Tickets',
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
                'name' => 'Total Tickets',
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'Ticket',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => 'Total Tickets',
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
                'name' => 'Tickets Daily',
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'Ticket',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => 'Tickets Daily',
                    'itemtype' => 'Ticket',
                    'visualization' => 'card',
                    'icon' => 'fas fa-calendar-day',
                    'color' => '#ffc107',
                    'filters' => [
                        ['field' => 15, 'searchtype' => 'equals', 'value' => '$$TODAY$$'] // Created today
                    ],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => 'Late Tickets',
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'Ticket',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => 'Late Tickets',
                    'itemtype' => 'Ticket',
                    'visualization' => 'card',
                    'icon' => 'fas fa-exclamation-triangle',
                    'color' => '#dc3545',
                    'filters' => [
                        ['field' => 12, 'searchtype' => 'notequals', 'value' => '6'],
                        ['field' => 82, 'searchtype' => 'lessthan', 'value' => '$$NOW$$'] // time_to_resolve < now
                    ],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => 'Backlog',
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'Ticket',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => 'Backlog',
                    'itemtype' => 'Ticket',
                    'visualization' => 'card',
                    'icon' => 'fas fa-tag',
                    'color' => '#795548',
                    'filters' => [
                        ['field' => 12, 'searchtype' => 'notequals', 'value' => '6'], // Not closed
                        ['field' => 5, 'searchtype' => 'empty', 'value' => ''] // Not assigned
                    ],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => 'Users',
                'widget_type' => 'custom',
                'visualization' => 'card',
                'itemtype' => 'User',
                'default_width' => 2,
                'default_height' => 2,
                'config' => [
                    'title' => 'Users',
                    'itemtype' => 'User',
                    'visualization' => 'card',
                    'icon' => 'fas fa-users',
                    'color' => '#fd7e14',
                    'filters' => [],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],

            // Charts
            [
                'name' => 'Tickets by Status',
                'widget_type' => 'custom',
                'visualization' => 'doughnut',
                'itemtype' => 'Ticket',
                'default_width' => 3,
                'default_height' => 4,
                'config' => [
                    'title' => 'Tickets by Status (Open)',
                    'itemtype' => 'Ticket',
                    'visualization' => 'doughnut',
                    'filters' => [
                        ['field' => 12, 'searchtype' => 'notequals', 'value' => '6'], // Not closed
                        ['field' => 12, 'searchtype' => 'notequals', 'value' => '5'], // Not solved
                    ],
                    'groupBy' => ['field' => 12], // Status
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => 'Tickets by Priority',
                'widget_type' => 'custom',
                'visualization' => 'bar',
                'itemtype' => 'Ticket',
                'default_width' => 3,
                'default_height' => 4,
                'config' => [
                    'title' => 'Tickets by Priority',
                    'itemtype' => 'Ticket',
                    'visualization' => 'bar',
                    'filters' => [
                        ['field' => 15, 'searchtype' => 'morethan', 'value' => '$$THISMONTH$$']
                    ],
                    'groupBy' => ['field' => 3], // Priority
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => 'Last 7 Days Tickets',
                'widget_type' => 'custom',
                'visualization' => 'line',
                'itemtype' => 'Ticket',
                'default_width' => 3,
                'default_height' => 4,
                'config' => [
                    'title' => 'Tickets - Last 7 Days',
                    'itemtype' => 'Ticket',
                    'visualization' => 'line',
                    'filters' => [
                        ['field' => 15, 'searchtype' => 'morethan', 'value' => '$$TODAY-7DAY$$']
                    ],
                    'groupBy' => ['field' => 15, 'interval' => 'day'],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 300000
                ]
            ],
            [
                'name' => 'Ticket Solving Period',
                'widget_type' => 'custom',
                'visualization' => 'pie',
                'itemtype' => 'Ticket',
                'default_width' => 3,
                'default_height' => 4,
                'config' => [
                    'title' => 'Ticket Solving Period',
                    'itemtype' => 'Ticket',
                    'visualization' => 'pie',
                    'filters' => [
                        ['field' => 19, 'searchtype' => 'morethan', 'value' => '0'] // Has resolution date
                    ],
                    'groupBy' => [
                        'type' => 'calculated',
                        'expression' => 'CASE
                            WHEN DATEDIFF(glpi_tickets.solvedate, glpi_tickets.date) <= 1 THEN "Same day"
                            WHEN DATEDIFF(glpi_tickets.solvedate, glpi_tickets.date) <= 3 THEN "2-3 days"
                            WHEN DATEDIFF(glpi_tickets.solvedate, glpi_tickets.date) <= 7 THEN "4-7 days"
                            ELSE "8+ days"
                        END'
                    ],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 300000
                ]
            ],
            [
                'name' => 'Ticket Evolution',
                'widget_type' => 'custom',
                'visualization' => 'multiline',
                'itemtype' => 'Ticket',
                'default_width' => 6,
                'default_height' => 4,
                'config' => [
                    'title' => 'Ticket Evolution (Year-over-Year)',
                    'itemtype' => 'Ticket',
                    'visualization' => 'multiline',
                    'filters' => [], // No date filter - all time
                    'groupBy' => ['field' => 15, 'interval' => 'month'], // Group by month
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'series' => [
                        ['name' => '2026', 'year_filter' => 2026],
                        ['name' => '2025', 'year_filter' => 2025],
                        ['name' => '2024', 'year_filter' => 2024],
                    ],
                    'refreshInterval' => 300000
                ]
            ],
            [
                'name' => 'Open Tickets Age',
                'widget_type' => 'custom',
                'visualization' => 'bar',
                'itemtype' => 'Ticket',
                'default_width' => 6,
                'default_height' => 4,
                'config' => [
                    'title' => 'Open Tickets Age',
                    'itemtype' => 'Ticket',
                    'visualization' => 'bar',
                    'filters' => [
                        ['field' => 12, 'searchtype' => 'notequals', 'value' => '6'] // Not closed
                    ],
                    'groupBy' => [
                        'type' => 'calculated',
                        'expression' => 'CASE
                            WHEN DATEDIFF(NOW(), glpi_tickets.date) <= 7 THEN "0-7 days"
                            WHEN DATEDIFF(NOW(), glpi_tickets.date) <= 14 THEN "8-14 days"
                            WHEN DATEDIFF(NOW(), glpi_tickets.date) <= 29 THEN "15-29 days"
                            WHEN DATEDIFF(NOW(), glpi_tickets.date) <= 59 THEN "30-59 days"
                            ELSE "60+ days"
                        END'
                    ],
                    'aggregation' => ['function' => 'COUNT', 'field' => null],
                    'refreshInterval' => 300000
                ]
            ],

            // Tables
            [
                'name' => 'Recent Tickets',
                'widget_type' => 'custom',
                'visualization' => 'table',
                'itemtype' => 'Ticket',
                'default_width' => 6,
                'default_height' => 4,
                'config' => [
                    'title' => 'Recent Tickets',
                    'itemtype' => 'Ticket',
                    'visualization' => 'table',
                    'filters' => [],
                    'columns' => [
                        ['field' => 2, 'name' => 'ID'],
                        ['field' => 1, 'name' => 'Title'],
                        ['field' => 12, 'name' => 'Status'],
                        ['field' => 3, 'name' => 'Priority'],
                        ['field' => 15, 'name' => 'Date'],
                    ],
                    'sortBy' => ['field' => 15, 'direction' => 'DESC'],
                    'limit' => 10,
                    'refreshInterval' => 60000
                ]
            ],
            [
                'name' => 'My Assigned Tickets',
                'widget_type' => 'custom',
                'visualization' => 'table',
                'itemtype' => 'Ticket',
                'default_width' => 6,
                'default_height' => 4,
                'config' => [
                    'title' => 'My Assigned Tickets',
                    'itemtype' => 'Ticket',
                    'visualization' => 'table',
                    'filters' => [
                        ['field' => 5, 'searchtype' => 'equals', 'value' => '$$MYSELF$$'], // Assigned to me
                        ['field' => 12, 'operator' => 'not_equals', 'value' => '6'] // Not closed
                    ],
                    'columns' => [
                        ['field' => 2, 'name' => 'ID'],
                        ['field' => 1, 'name' => 'Title'],
                        ['field' => 12, 'name' => 'Status'],
                        ['field' => 3, 'name' => 'Priority'],
                    ],
                    'sortBy' => ['field' => 3, 'direction' => 'DESC'],
                    'limit' => 10,
                    'refreshInterval' => 60000
                ]
            ],
        ];

        foreach ($defaultWidgets as $widget) {
            $configJson = json_encode($widget['config']);
            unset($widget['config']);
            $widget['config'] = $configJson;
            $widget['users_id'] = 0; // Global widgets

            $DB->insert($table, $widget);
            $widgets[] = $DB->insertId();
        }

        return $widgets;
    }

    /**
     * Get all available widget definitions for current user
     *
     * @return array
     */
    public static function getAvailableWidgets(): array
    {
        global $DB;

        $table = self::getTable();
        $userId = Session::getLoginUserID();

        $result = $DB->request([
            'FROM' => $table,
            'WHERE' => [
                'OR' => [
                    ['users_id' => 0], // Global widgets
                    ['users_id' => $userId], // User's widgets
                ],
                'is_active' => 1,
            ],
            'ORDER' => ['visualization ASC', 'name ASC'],
        ]);

        $widgets = [];
        foreach ($result as $row) {
            $row['config'] = json_decode($row['config'] ?? '{}', true);
            $row['is_global'] = ($row['users_id'] == 0);
            $widgets[] = $row;
        }

        return $widgets;
    }

    /**
     * Get widget definition by ID
     *
     * @param int $widgetId
     * @return array|null
     */
    public static function getWidgetById(int $widgetId): ?array
    {
        global $DB;

        $table = self::getTable();
        $userId = Session::getLoginUserID();

        $result = $DB->request([
            'FROM' => $table,
            'WHERE' => [
                'id' => $widgetId,
                'OR' => [
                    ['users_id' => 0],
                    ['users_id' => $userId],
                ],
            ],
            'LIMIT' => 1,
        ]);

        $row = $result->current();
        if ($row) {
            $row['config'] = json_decode($row['config'] ?? '{}', true);
        }

        return $row ?: null;
    }

    /**
     * Create a new widget definition
     *
     * @param array $data Widget data
     * @return int|false Widget ID or false on failure
     */
    public static function createWidget(array $data): int|false
    {
        global $DB;

        $table = self::getTable();
        $userId = Session::getLoginUserID();

        $config = $data['config'] ?? [];
        
        $insertData = [
            'name' => $data['name'] ?? $config['title'] ?? 'New Widget',
            'users_id' => $userId, // User-created widgets are always personal
            'widget_type' => $data['widget_type'] ?? 'custom',
            'visualization' => $config['visualization'] ?? 'card',
            'itemtype' => $config['itemtype'] ?? null,
            'config' => json_encode($config),
            'default_width' => $data['width'] ?? $data['default_width'] ?? 4,
            'default_height' => $data['height'] ?? $data['default_height'] ?? 4,
            'is_active' => 1,
        ];

        $DB->insert($table, $insertData);

        return $DB->insertId() ?: false;
    }

    /**
     * Update widget definition
     *
     * @param int $widgetId
     * @param array $data
     * @return bool
     */
    public static function updateWidget(int $widgetId, array $data): bool
    {
        global $DB;

        $table = self::getTable();
        $userId = Session::getLoginUserID();

        // Only allow editing own widgets
        $widget = self::getWidgetById($widgetId);
        if (!$widget || ($widget['users_id'] != 0 && $widget['users_id'] != $userId)) {
            return false;
        }

        // If it's a global widget, don't allow edit (could clone instead)
        if ($widget['users_id'] == 0) {
            return false;
        }

        $config = $data['config'] ?? [];
        
        $updateData = [
            'name' => $data['name'] ?? $config['title'] ?? $widget['name'],
            'visualization' => $config['visualization'] ?? $widget['visualization'],
            'itemtype' => $config['itemtype'] ?? $widget['itemtype'],
            'config' => json_encode($config),
            'default_width' => $data['width'] ?? $data['default_width'] ?? $widget['default_width'],
            'default_height' => $data['height'] ?? $data['default_height'] ?? $widget['default_height'],
        ];

        return $DB->update($table, $updateData, ['id' => $widgetId]);
    }

    /**
     * Delete widget definition (only own widgets)
     *
     * @param int $widgetId
     * @return bool
     */
    public static function deleteWidget(int $widgetId): bool
    {
        global $DB;

        $table = self::getTable();
        $userId = Session::getLoginUserID();

        // Only allow deleting own widgets
        return $DB->delete($table, [
            'id' => $widgetId,
            'users_id' => $userId,
        ]);
    }
}
