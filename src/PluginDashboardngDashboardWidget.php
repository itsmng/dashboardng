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
     * Install database table and populate with default widgets (only on fresh install)
     *
     * @param int|null $defaultDashboardId Optional dashboard ID to populate with widgets
     * @param array $params Optional params; if migrate_only=true, skip widget population
     * @return boolean
     */
    public static function install(?int $defaultDashboardId = null, array $params = []): bool
    {
        global $DB;

        // On upgrade (migrate_only flag), only ensure table exists without populating widgets
        if (isset($params['migrate_only']) && $params['migrate_only']) {
            $table = self::getTable();
            if (!$DB->tableExists($table)) {
                $query = <<<SQL
                    CREATE TABLE `$table` (
                        `id` INT(11) NOT NULL AUTO_INCREMENT,
                        `dashboards_id` INT(11) NOT NULL,
                        `widget_definitions_id` INT(11) NOT NULL,
                        `x` INT(11) NOT NULL DEFAULT 0,
                        `y` INT(11) NOT NULL DEFAULT 0,
                        `width` INT(11) NOT NULL DEFAULT 4,
                        `height` INT(11) NOT NULL DEFAULT 4,
                        `config_override` JSON DEFAULT NULL COMMENT 'Per-instance config overrides',
                        `is_visible` TINYINT(1) NOT NULL DEFAULT 1,
                        `position` INT(11) NOT NULL DEFAULT 0,
                        `date_creation` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        `date_mod` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (`id`),
                        KEY `dashboards_id` (`dashboards_id`),
                        KEY `widget_definitions_id` (`widget_definitions_id`),
                        KEY `is_visible` (`is_visible`),
                        UNIQUE KEY `unique_dashboard_widget` (`dashboards_id`, `widget_definitions_id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                SQL;
                $DB->queryOrDie($query, $DB->error());
            }
            return true;
        }

        $table = self::getTable();

        if (!$DB->tableExists($table)) {
            $query = <<<SQL
                CREATE TABLE `$table` (
                    `id` INT(11) NOT NULL AUTO_INCREMENT,
                    `dashboards_id` INT(11) NOT NULL,
                    `widget_definitions_id` INT(11) NOT NULL,
                    `x` INT(11) NOT NULL DEFAULT 0,
                    `y` INT(11) NOT NULL DEFAULT 0,
                    `width` INT(11) NOT NULL DEFAULT 4,
                    `height` INT(11) NOT NULL DEFAULT 4,
                    `config_override` JSON DEFAULT NULL COMMENT 'Per-instance config overrides',
                    `is_visible` TINYINT(1) NOT NULL DEFAULT 1,
                    `position` INT(11) NOT NULL DEFAULT 0,
                    `date_creation` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `date_mod` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    KEY `dashboards_id` (`dashboards_id`),
                    KEY `widget_definitions_id` (`widget_definitions_id`),
                    KEY `is_visible` (`is_visible`),
                    UNIQUE KEY `unique_dashboard_widget` (`dashboards_id`, `widget_definitions_id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            SQL;

            $DB->queryOrDie($query, $DB->error());

            // Populate with default widgets if dashboard ID provided
            if ($defaultDashboardId !== null) {
                return self::populateDefaultWidgets($defaultDashboardId) > 0;
            }
        } else {
            // Table exists, check if we need to populate widgets (ONLY on fresh install)
            if ($defaultDashboardId !== null) {
                $existingCount = $DB->request([
                    'COUNT' => 'cpt',
                    'FROM' => $table,
                    'WHERE' => ['dashboards_id' => $defaultDashboardId]
                ]);

                // Only populate if no widgets exist for this dashboard
                if ($existingCount->current()['cpt'] == 0) {
                    return self::populateDefaultWidgets($defaultDashboardId) > 0;
                }
            }
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

        // Check if already on dashboard
        $existing = $DB->request([
            'FROM' => $table,
            'WHERE' => [
                'dashboards_id' => $dashboardId,
                'widget_definitions_id' => $widgetDefinitionId,
            ],
            'LIMIT' => 1,
        ]);

        if ($existing->current()) {
            // Widget already on dashboard
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
     * Populate default dashboard with default widgets
     *
     * @param int $dashboardId
     * @return int Number of widgets added
     */
    public static function populateDefaultWidgets(int $dashboardId): int
    {
        global $DB;

        // Use session-safe method to get global widgets
        $widgets = self::getGlobalWidgetDefinitions();

        if (empty($widgets)) {
            // No widgets available - this is an error condition
            trigger_error(
                'Plugin dashboardng: Cannot populate dashboard - no widget definitions found. ' .
                'Ensure PluginDashboardngWidgetDefinition::install() completed successfully.',
                E_USER_WARNING
            );
            return 0;
        }

        $added = 0;
        $table = self::getTable();

        // Define custom layout matching user's design
        // Key: widget ID, Value: [x, y, width, height]
        $customLayout = [
            3 => ['x' => 0, 'y' => 0, 'width' => 2, 'height' => 2],
            1 => ['x' => 2, 'y' => 0, 'width' => 2, 'height' => 2],
            4 => ['x' => 4, 'y' => 0, 'width' => 2, 'height' => 2],
            5 => ['x' => 6, 'y' => 0, 'width' => 2, 'height' => 2],
            2 => ['x' => 8, 'y' => 0, 'width' => 2, 'height' => 2],
            6 => ['x' => 10, 'y' => 0, 'width' => 2, 'height' => 2],
            7 => ['x' => 0, 'y' => 2, 'width' => 6, 'height' => 4],
            10 => ['x' => 6, 'y' => 2, 'width' => 6, 'height' => 4],
            9 => ['x' => 0, 'y' => 6, 'width' => 6, 'height' => 4],
            8 => ['x' => 6, 'y' => 6, 'width' => 6, 'height' => 4],
            12 => ['x' => 0, 'y' => 10, 'width' => 6, 'height' => 4],
            11 => ['x' => 6, 'y' => 10, 'width' => 6, 'height' => 4],
        ];

        // Calculate position order based on layout (y then x)
        $widgetOrder = [];
        foreach ($customLayout as $widgetId => $layout) {
            $widgetOrder[$widgetId] = $layout['y'] * 100 + $layout['x'];
        }
        asort($widgetOrder);

        $positionIndex = 0;
        foreach ($widgets as $widget) {
            if (!isset($widget['id'])) continue;

            $widgetId = $widget['id'];

            // Check if this widget has a custom layout defined
            if (isset($customLayout[$widgetId])) {
                $position = $customLayout[$widgetId];
            } else {
                // Widget not in custom layout - place below main layout
                $position = ['x' => 0, 'y' => 14 + ($positionIndex * 4)];
            }

            // Use widget's default dimensions if not specified in layout
            $position['width'] = $position['width'] ?? $widget['default_width'];
            $position['height'] = $position['height'] ?? $widget['default_height'];

            // Check if widget already exists for this dashboard (idempotency)
            $existing = $DB->request([
                'FROM' => $table,
                'WHERE' => [
                    'dashboards_id' => $dashboardId,
                    'widget_definitions_id' => $widget['id'],
                ],
                'LIMIT' => 1,
            ]);

            if (!$existing->current()) {
                $insertData = [
                    'dashboards_id' => $dashboardId,
                    'widget_definitions_id' => $widget['id'],
                    'x' => $position['x'],
                    'y' => $position['y'],
                    'width' => $position['width'],
                    'height' => $position['height'],
                    'is_visible' => 1,
                    'position' => isset($widgetOrder[$widgetId]) ? array_search($widgetId, array_keys($widgetOrder)) : $positionIndex,
                ];

                if ($DB->insert($table, $insertData)) {
                    $added++;
                }
            }

            $positionIndex++;
        }

        return $added;
    }
}
