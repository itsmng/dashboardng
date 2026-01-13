<?php

namespace GlpiPlugin\Dashboardng;

use CommonDBTM;
use Session;

/**
 * Dashboard Management - Stores dashboard definitions
 * 
 * Dashboards can be:
 * - Global (users_id = 0): Available to all users
 * - User-specific (users_id > 0): Personal dashboard
 */
class PluginDashboardngDashboard extends CommonDBTM
{
    public static $rightname = 'plugin_dashboardng_dashboard';

    public static function getTable($classname = null): string
    {
        return 'glpi_plugin_dashboardng_dashboards';
    }

    /**
     * Install database table
     *
     * @return int|false Dashboard ID on success, false on failure
     */
    public static function install(): int|false
    {
        global $DB;

        $table = self::getTable();

        if (!$DB->tableExists($table)) {
            $query = <<<SQL
                CREATE TABLE `$table` (
                    `id` INT(11) NOT NULL AUTO_INCREMENT,
                    `name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
                    `users_id` INT(11) NOT NULL DEFAULT 0 COMMENT '0 = global dashboard',
                    `is_default` TINYINT(1) NOT NULL DEFAULT 0,
                    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                    `config` JSON DEFAULT NULL COMMENT 'Dashboard-level settings',
                    `date_creation` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `date_mod` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (`id`),
                    KEY `users_id` (`users_id`),
                    KEY `is_default` (`is_default`),
                    KEY `is_active` (`is_active`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            SQL;

            $DB->queryOrDie($query, $DB->error());

            // Insert default global dashboard directly with raw SQL
            $config = $DB->escape(json_encode(['refreshInterval' => 60000, 'columnCount' => 12]));
            $insertQuery = "INSERT INTO `$table` (`name`, `users_id`, `is_default`, `is_active`, `config`)
                           VALUES ('Global Dashboard', 0, 1, 1, '$config')";
            $DB->queryOrDie($insertQuery, $DB->error());

            // Return the newly created dashboard ID
            return (int) $DB->insertId();
        } else {
            // Table exists, ensure default dashboard exists and return its ID
            return self::createDefaultDashboard() ?? false;
        }
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
     * Create the default global dashboard (idempotent)
     * 
     * @return int|null The dashboard ID, or null on failure
     */
    public static function createDefaultDashboard(): ?int
    {
        global $DB;

        $table = self::getTable();

        // Check if default global dashboard already exists
        foreach ($DB->request([
            'FROM' => $table,
            'WHERE' => [
                'users_id' => 0,
                'is_default' => 1,
            ],
            'LIMIT' => 1,
        ]) as $row) {
            return (int) $row['id'];
        }

        // Create the default global dashboard using raw SQL for reliability
        $config = $DB->escape(json_encode([
            'refreshInterval' => 60000,
            'columnCount' => 12,
        ]));
        
        $query = "INSERT INTO `$table` (`name`, `users_id`, `is_default`, `is_active`, `config`) 
                  VALUES ('Global Dashboard', 0, 1, 1, '$config')";
        
        $DB->query($query);
        $insertId = $DB->insertId();
        
        return $insertId > 0 ? (int) $insertId : null;
    }

    /**
     * Get the default dashboard for current user
     * Returns user's personal dashboard if exists, otherwise global
     *
     * @return array|null
     */
    public static function getDefaultDashboard(): ?array
    {
        global $DB;

        $table = self::getTable();
        
        // Check if table exists
        if (!$DB->tableExists($table)) {
            return null;
        }

        $userId = Session::getLoginUserID();

        // First try to get user's personal default dashboard (only if logged in)
        if ($userId && $userId !== false) {
            foreach ($DB->request([
                'FROM' => $table,
                'WHERE' => [
                    'users_id' => (int) $userId,
                    'is_default' => 1,
                    'is_active' => 1,
                ],
                'LIMIT' => 1,
            ]) as $row) {
                return $row;
            }
        }

        // Fall back to global default dashboard
        foreach ($DB->request([
            'FROM' => $table,
            'WHERE' => [
                'users_id' => 0,
                'is_default' => 1,
                'is_active' => 1,
            ],
            'LIMIT' => 1,
        ]) as $row) {
            return $row;
        }

        return null;
    }

    /**
     * Get all dashboards available to current user
     *
     * @return array
     */
    public static function getAvailableDashboards(): array
    {
        global $DB;

        $table = self::getTable();
        $userId = Session::getLoginUserID();

        $result = $DB->request([
            'FROM' => $table,
            'WHERE' => [
                'OR' => [
                    ['users_id' => 0], // Global dashboards
                    ['users_id' => $userId], // User's dashboards
                ],
                'is_active' => 1,
            ],
            'ORDER' => ['users_id ASC', 'name ASC'],
        ]);

        $dashboards = [];
        foreach ($result as $row) {
            $row['config'] = json_decode($row['config'] ?? '{}', true);
            $row['is_global'] = ($row['users_id'] == 0);
            $dashboards[] = $row;
        }

        return $dashboards;
    }

    /**
     * Create a personal dashboard for user (copy from global)
     *
     * @param int $sourceDashboardId Dashboard to copy from
     * @param string $name Name for new dashboard
     * @return int|false New dashboard ID or false on failure
     */
    public static function createPersonalDashboard(int $sourceDashboardId = 0, string $name = 'My Dashboard'): int|false
    {
        global $DB;

        $table = self::getTable();
        $userId = Session::getLoginUserID();

        // If no source specified, use global default
        if ($sourceDashboardId === 0) {
            $source = self::getDefaultDashboard();
            if ($source && $source['users_id'] == 0) {
                $sourceDashboardId = $source['id'];
            }
        }

        $DB->insert($table, [
            'name' => $name,
            'users_id' => $userId,
            'is_default' => 1, // Make it the user's default
            'is_active' => 1,
            'config' => json_encode([
                'refreshInterval' => 60000,
                'columnCount' => 12,
            ]),
        ]);

        $newDashboardId = $DB->insertId();

        // Copy widgets from source dashboard
        if ($sourceDashboardId > 0 && $newDashboardId) {
            PluginDashboardngDashboardWidget::copyWidgetsFromDashboard(
                $sourceDashboardId,
                $newDashboardId
            );
        }

        return $newDashboardId ?: false;
    }

    /**
     * Get dashboard by ID (with permission check)
     *
     * @param int $dashboardId
     * @return array|null
     */
    public static function getDashboardById(int $dashboardId): ?array
    {
        global $DB;

        $table = self::getTable();
        $userId = Session::getLoginUserID();

        // Build WHERE clause based on whether user is logged in
        $where = ['id' => $dashboardId];
        
        if ($userId !== false && $userId > 0) {
            // User is logged in - can access global or own dashboards
            $where['OR'] = [
                ['users_id' => 0], // Global
                ['users_id' => $userId], // Own
            ];
        } else {
            // No user session - can only access global dashboards
            $where['users_id'] = 0;
        }

        $result = $DB->request([
            'FROM' => $table,
            'WHERE' => $where,
            'LIMIT' => 1,
        ]);

        $row = $result->current();
        if ($row) {
            $row['config'] = json_decode($row['config'] ?? '{}', true);
            $row['is_global'] = ($row['users_id'] == 0);
        }

        return $row ?: null;
    }
}
