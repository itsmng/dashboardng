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

    private static function normalizeDashboardRow(?array $row): ?array
    {
        if (!$row) {
            return null;
        }

        $row['config'] = json_decode($row['config'] ?? '{}', true);
        $row['is_global'] = ((int) ($row['users_id'] ?? 0) === 0);
        return $row;
    }

    public static function getTable($classname = null): string
    {
        return 'glpi_plugin_dashboardng_dashboards';
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
                return self::normalizeDashboardRow($row);
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
            return self::normalizeDashboardRow($row);
        }

        return null;
    }

    /**
     * Get the global dashboard (always returns global, never personal)
     *
     * @return array|null
     */
    public static function getGlobalDashboard(): ?array
    {
        global $DB;

        $table = self::getTable();

        // Check if table exists
        if (!$DB->tableExists($table)) {
            return null;
        }

        // Return global default dashboard only
        foreach ($DB->request([
            'FROM' => $table,
            'WHERE' => [
                'users_id' => 0,
                'is_default' => 1,
                'is_active' => 1,
            ],
            'LIMIT' => 1,
        ]) as $row) {
            return self::normalizeDashboardRow($row);
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
            $dashboards[] = self::normalizeDashboardRow($row);
        }

        return $dashboards;
    }

    /**
     * Create a personal dashboard for user (copy from source)
     * This will replace any existing personal default dashboard
     *
     * @param int $sourceDashboardId Dashboard to copy from
     * @param string $name Name for new dashboard
     * @return int|false New dashboard ID or false on failure
     */
     public static function createPersonalDashboard(int $sourceDashboardId = 0, string $name = 'My Dashboard', bool $setAsDefault = true): int|false
    {
        global $DB;

        $table = self::getTable();
        $userId = Session::getLoginUserID();

        if (!$userId || $userId <= 0) {
            return false;
        }

        // Find existing personal default dashboard
        $existingDefault = null;
        foreach ($DB->request([
            'FROM' => $table,
            'WHERE' => [
                'users_id' => (int) $userId,
                'is_default' => 1,
            ],
            'LIMIT' => 1,
        ]) as $row) {
            $existingDefault = $row;
            break;
        }

        // If source is the current personal dashboard, just return it
        if ($sourceDashboardId > 0 && $existingDefault && $sourceDashboardId == $existingDefault['id']) {
            return (int) $sourceDashboardId;
        }

        // If no source specified, use global default
        if ($sourceDashboardId === 0) {
            $source = self::getDefaultDashboard();
            if ($source && $source['users_id'] == 0) {
                $sourceDashboardId = $source['id'];
            }
        }

        $config = [
            'refreshInterval' => 60000,
            'columnCount' => 12,
        ];
        if ($sourceDashboardId > 0) {
            $config['source_dashboard_id'] = $sourceDashboardId;
        }

        $DB->insert($table, [
            'name' => $name,
            'users_id' => $userId,
            'is_default' => 0,
            'is_active' => 1,
            'config' => json_encode($config),
        ]);

        $newDashboardId = $DB->insertId();

        // Copy widgets from source dashboard
        if ($sourceDashboardId > 0 && $newDashboardId) {
            PluginDashboardngDashboardWidget::copyWidgetsFromDashboard(
                $sourceDashboardId,
                $newDashboardId
            );
        }

        if ($newDashboardId && $setAsDefault) {
            self::setDefaultDashboardForUser((int) $newDashboardId, (int) $userId);
        }

        return $newDashboardId ?: false;
    }

    /**
     * Create a shared global dashboard (template)
     *
     * @param int $sourceDashboardId Dashboard to copy from
     * @param string $name Name for the shared dashboard
     * @return int|false New dashboard ID or false on failure
     */
    public static function createSharedDashboard(int $sourceDashboardId = 0, string $name = 'Shared Dashboard'): int|false
    {
        global $DB;

        $table = self::getTable();

        // If no source specified, use global default
        if ($sourceDashboardId === 0) {
            $source = self::getDefaultDashboard();
            if ($source) {
                $sourceDashboardId = $source['id'];
            }
        }

        $DB->insert($table, [
            'name' => $name,
            'users_id' => 0,
            'is_default' => 0,
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
        if ($userId !== false && $userId > 0) {
            // User is logged in - can access global or own dashboards
            $where = [
                'id' => $dashboardId,
                'OR' => [
                    ['users_id' => 0],
                    ['users_id' => $userId]
                ]
            ];
        } else {
            // No user session - can only access global dashboards
            $where = [
                'id' => $dashboardId,
                'users_id' => 0
            ];
        }

        $result = $DB->request([
            'FROM' => $table,
            'WHERE' => $where,
            'LIMIT' => 1,
        ]);

        $row = $result->next();
        return self::normalizeDashboardRow($row ?: null);
    }

    /**
     * Set the default personal dashboard for the current user
     *
     * @param int $dashboardId
     * @param int|null $userId
     * @return bool
     */
    public static function setDefaultDashboardForUser(int $dashboardId, ?int $userId = null): bool
    {
        global $DB;

        $table = self::getTable();
        $userId = $userId ?? Session::getLoginUserID();

        if (!$userId || $userId <= 0) {
            return false;
        }

        $dashboard = self::getDashboardById($dashboardId);
        if (!$dashboard || (int) $dashboard['users_id'] !== (int) $userId) {
            return false;
        }

        $DB->update($table, ['is_default' => 0], ['users_id' => (int) $userId]);

        return (bool) $DB->update($table, ['is_default' => 1], [
            'id' => (int) $dashboardId,
            'users_id' => (int) $userId,
        ]);
    }

    public static function deleteDashboard(int $dashboardId): bool
    {
        global $DB;

        $table = self::getTable();
        $userId = Session::getLoginUserID();

        $dashboard = self::getDashboardById($dashboardId);
        if (!$dashboard) {
            return false;
        }

        if ((int) $dashboard['users_id'] === 0 && (int) $dashboard['is_default'] === 1) {
            return false;
        }

        if ($userId !== false && $userId > 0 && (int) $dashboard['users_id'] !== (int) $userId) {
            return false;
        }

        PluginDashboardngDashboardWidget::deleteWidgetsForDashboard($dashboardId);

        $result = $DB->delete($table, ['id' => (int) $dashboardId]);

        return $result !== false;
    }

    public static function canDeleteDashboard(int $dashboardId, ?int $userId = null): array
    {
        $dashboard = self::getDashboardById($dashboardId);
        if (!$dashboard) {
            return ['can_delete' => false, 'reason' => 'Dashboard not found'];
        }

        if ((int) $dashboard['users_id'] === 0) {
            if (!Session::haveRight('plugin_dashboardng_globaldashboard', UPDATE)) {
                return ['can_delete' => false, 'reason' => 'Unauthorized'];
            }
            if ((int) $dashboard['is_default'] === 1) {
                return ['can_delete' => false, 'reason' => 'Cannot delete the default dashboard'];
            }
        } else {
            if (!Session::haveRight('plugin_dashboardng_mydashboard', UPDATE)) {
                return ['can_delete' => false, 'reason' => 'Unauthorized'];
            }

            $userId = $userId ?? Session::getLoginUserID();
            if ($userId !== false && $userId > 0 && (int) $dashboard['users_id'] !== (int) $userId) {
                return ['can_delete' => false, 'reason' => 'Unauthorized'];
            }
        }

        return ['can_delete' => true, 'reason' => null];
    }
}
