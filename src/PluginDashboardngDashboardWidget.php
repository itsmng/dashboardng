<?php

namespace GlpiPlugin\Dashboardng;

use CommonDBTM;
use Session;
use Toolbox;

/**
 * Dashboard-Widget Relationship - Links widgets to dashboards with positions
 * 
 * This table stores:
 * - Which widget is on which dashboard
 * - The position (x, y, width, height) of each widget
 * - Per-instance overrides (if any)
 */
class PluginDashboardngDashboardWidget extends CommonDBTM
{
    public static $rightname = 'plugin_dashboardng_widget';

    public static function getTable($classname = null): string
    {
        return 'glpi_plugin_dashboardng_dashboard_widgets';
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
     * Get all global widget definitions (session-safe for installation)
     * This method does NOT use Session, making it safe to call during plugin installation
     *
     * @return array
     */
    public static function getGlobalWidgetDefinitions(): array
    {
        global $DB;

        $defTable = PluginDashboardngWidgetDefinition::getTable();

        $result = $DB->request([
            'FROM' => $defTable,
            'WHERE' => [
                'users_id' => 0, // Only global widgets
                'is_active' =>1,
            ],
            'ORDER' => ['visualization ASC', 'name ASC'],
        ]);

        $widgets = [];
        foreach ($result as $row) {
            $row['config'] = json_decode($row['config'] ?? '{}', true);
            $row['is_global'] = true;
            $widgets[] = $row;
        }

        return $widgets;
    }

    /**
     * Get all widgets for a dashboard with their configurations
     *
     * @param int $dashboardId
     * @return array
     */
    public static function getWidgetsForDashboard(int $dashboardId): array
    {
        global $DB;

        $table = self::getTable();
        $defTable = PluginDashboardngWidgetDefinition::getTable();

        $result = $DB->request([
            'SELECT' => [
                "$table.id",
                "$table.dashboards_id",
                "$table.widget_definitions_id",
                "$table.x",
                "$table.y",
                "$table.width",
                "$table.height",
                "$table.config_override",
                "$table.is_visible",
                "$table.position",
                "$defTable.name",
                "$defTable.widget_type",
                "$defTable.visualization",
                "$defTable.itemtype",
                "$defTable.config",
            ],
            'FROM' => $table,
            'LEFT JOIN' => [
                $defTable => [
                    'ON' => [
                        $table => 'widget_definitions_id',
                        $defTable => 'id',
                    ]
                ]
            ],
            'WHERE' => [
                "$table.dashboards_id" => $dashboardId,
                "$table.is_visible" => 1,
            ],
            'ORDER' => ["$table.position ASC", "$table.y ASC", "$table.x ASC"],
        ]);

        $widgets = [];
        foreach ($result as $row) {
            // Parse config from widget definition
            $config = json_decode($row['config'] ?? '{}', true);
            
            // Apply any per-instance overrides
            $override = json_decode($row['config_override'] ?? '{}', true);
            if (!empty($override)) {
                $config = array_merge($config, $override);
            }

            $widgets[] = [
                'id' => $row['id'],
                'widget_definition_id' => $row['widget_definitions_id'],
                'dashboard_id' => $row['dashboards_id'],
                'name' => $row['name'],
                'widget_type' => $row['widget_type'],
                'visualization' => $row['visualization'],
                'itemtype' => $row['itemtype'],
                'config' => $config,
                'x' => (int) $row['x'],
                'y' => (int) $row['y'],
                'width' => (int) $row['width'],
                'height' => (int) $row['height'],
                'position' => (int) $row['position'],
            ];
        }

        return $widgets;
    }

    /**
     * Add a widget to a dashboard
     *
     * @param int $dashboardId
     * @param int $widgetDefinitionId
     * @param array $position Optional position data
     * @return int|false New placement ID or false on failure
     */
    public static function addWidgetToDashboard(
        int $dashboardId,
        int $widgetDefinitionId,
        array $position = []
    ): int|false {
        global $DB;

        $table = self::getTable();

        // Get widget definition for defaults
        $widgetDef = PluginDashboardngWidgetDefinition::getWidgetById($widgetDefinitionId);
        if (!$widgetDef) {
            return false;
        }

        // Find next Y position
        $maxY = 0;
        $existingWidgets = self::getWidgetsForDashboard($dashboardId);
        foreach ($existingWidgets as $w) {
            $bottom = $w['y'] + $w['height'];
            if ($bottom > $maxY) {
                $maxY = $bottom;
            }
        }

        $insertData = [
            'dashboards_id' => $dashboardId,
            'widget_definitions_id' => $widgetDefinitionId,
            'x' => $position['x'] ?? 0,
            'y' => $position['y'] ?? $maxY,
            'width' => $position['width'] ?? $widgetDef['default_width'],
            'height' => $position['height'] ?? $widgetDef['default_height'],
            'is_visible' => 1,
            'position' => count($existingWidgets),
        ];

        $DB->insert($table, $insertData);

        return $DB->insertId() ?: false;
    }

    /**
     * Remove a widget from a dashboard
     *
     * @param int $placementId The dashboard_widgets record ID
     * @param int $dashboardId For security verification
     * @return bool
     */
    public static function removeWidgetFromDashboard(int $placementId, int $dashboardId): bool
    {
        global $DB;

        $table = self::getTable();

        // Verify dashboard ownership
        $dashboard = PluginDashboardngDashboard::getDashboardById($dashboardId);
        if (!$dashboard) {
            return false;
        }

        // Only allow removing from personal dashboards (not global)
        if ($dashboard['users_id'] == 0) {
            return false;
        }

        return $DB->delete($table, [
            'id' => $placementId,
            'dashboards_id' => $dashboardId,
        ]);
    }

    /**
     * Update widget positions on a dashboard
     *
     * @param int $dashboardId
     * @param array $positions Array of {id, x, y, w, h}
     * @return array ['success' => bool, 'updated' => int, 'skipped' => int, 'error' => ?string]
     */
    public static function updatePositions(int $dashboardId, array $positions): array
    {
        global $DB;

        $table = self::getTable();

        // Get all valid widget IDs for this dashboard
        $validWidgetIds = $DB->request([
            'SELECT' => ['id'],
            'FROM' => $table,
            'WHERE' => ['dashboards_id' => $dashboardId],
        ]);

        $validIds = [];
        foreach ($validWidgetIds as $row) {
            $validIds[] = (int) $row['id'];
        }

        // If no widgets found, dashboard doesn't exist or has no widgets
        if (empty($validIds)) {
            return [
                'success' => false,
                'updated' => 0,
                'skipped' => 0,
                'error' => 'Dashboard not found or has no widgets',
            ];
        }

        $success = true;
        $updatedCount = 0;
        $skippedCount = 0;

        foreach ($positions as $pos) {
            if (!isset($pos['id'])) {
                continue;
            }

            $widgetId = (int) $pos['id'];

            // Skip if widget doesn't belong to this dashboard
            if (!in_array($widgetId, $validIds)) {
                $success = false;
                $skippedCount++;
                continue;
            }

            $updateData = [];
            if (isset($pos['x'])) $updateData['x'] = (int) $pos['x'];
            if (isset($pos['y'])) $updateData['y'] = (int) $pos['y'];
            if (isset($pos['w'])) $updateData['width'] = (int) $pos['w'];
            if (isset($pos['h'])) $updateData['height'] = (int) $pos['h'];

            if (!empty($updateData)) {
                $result = $DB->update($table, $updateData, [
                    'id' => $widgetId,
                    'dashboards_id' => $dashboardId,
                ]);

                // Check for SQL error (returns false or null on failure)
                if (!$result) {
                    $success = false;
                    Toolbox::logError("DashboardNG: Widget $widgetId SQL update failed. " .
                        "Data: " . json_encode($updateData) . ", Error: " . $DB->error());
                } else {
                    $updatedCount++;
                }
            }
        }

        return [
            'success' => $success,
            'updated' => $updatedCount,
            'skipped' => $skippedCount,
        ];
    }

    /**
     * Copy widgets from one dashboard to another
     *
     * @param int $sourceDashboardId
     * @param int $targetDashboardId
     * @return int Number of widgets copied
     */
    public static function copyWidgetsFromDashboard(int $sourceDashboardId, int $targetDashboardId): int
    {
        global $DB;

        $table = self::getTable();
        $sourceWidgets = self::getWidgetsForDashboard($sourceDashboardId);
        $copied = 0;

        foreach ($sourceWidgets as $widget) {
            $insertData = [
                'dashboards_id' => $targetDashboardId,
                'widget_definitions_id' => $widget['widget_definition_id'],
                'x' => $widget['x'],
                'y' => $widget['y'],
                'width' => $widget['width'],
                'height' => $widget['height'],
                'is_visible' => 1,
                'position' => $widget['position'],
            ];

            if ($DB->insert($table, $insertData)) {
                $copied++;
            }
        }

        return $copied;
    }

    /**
     * Delete all widgets for a dashboard
     *
     * @param int $dashboardId
     * @return int Number of widgets deleted
     */
    public static function deleteWidgetsForDashboard(int $dashboardId): int
    {
        global $DB;

        $table = self::getTable();

        $DB->delete($table, [
            'dashboards_id' => $dashboardId
        ]);

        return $DB->affectedRows();
    }
}
