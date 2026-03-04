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

        $row = $result->next();
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
            'config' => json_encode($config, JSON_UNESCAPED_UNICODE),
            'default_width' => $data['default_width'] ?? 4,
            'default_height' => $data['default_height'] ?? 4,
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
            'config' => json_encode($config, JSON_UNESCAPED_UNICODE),
            'default_width' => $data['default_width'] ?? $widget['default_width'],
            'default_height' => $data['default_height'] ?? $widget['default_height'],
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
