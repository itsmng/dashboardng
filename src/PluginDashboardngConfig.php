<?php

namespace GlpiPlugin\Dashboardng;

use CommonDBTM;
use Config;
use Html;
use Session;

class PluginDashboardngConfig extends CommonDBTM
{
    public static $rightname = 'plugin_dashboardng_config';

    public static function getTable($classname = null): string
    {
        return 'glpi_plugin_dashboardng_config';
    }

    public static function install(): bool
    {
        global $DB;

        $table = self::getTable();

        if (!$DB->tableExists($table)) {
            $query = <<<SQL
                CREATE TABLE `$table` (
                    `id` INT(11) NOT NULL AUTO_INCREMENT,
                    `users_id` INT(11) NOT NULL DEFAULT 0,
                    `name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
                    `value` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                    PRIMARY KEY (`id`),
                    KEY `users_id` (`users_id`),
                    KEY `name` (`name`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            SQL;

            $DB->queryOrDie($query, $DB->error());

            self::setGlobal('refresh_interval', '60');
            self::setGlobal('default_period', '0');
            self::setGlobal('theme', 'default');
            
            // Query limits for dynamic widgets
            self::setGlobal('query_default_limit', '1000');
            self::setGlobal('query_max_limit', '10000');
            self::setGlobal('query_timeout', '30');
        }

        return true;
    }

    public static function uninstall(): bool
    {
        global $DB;

        $table = self::getTable();

        if ($DB->tableExists($table)) {
            $DB->queryOrDie("DROP TABLE `$table`", $DB->error());
        }

        return true;
    }

    public static function get(string $name, $default = null)
    {
        global $DB;

        $userId = $_SESSION['glpiID'] ?? 0;
        $table = self::getTable();

        $result = $DB->request([
            'SELECT' => ['value'],
            'FROM'   => $table,
            'WHERE'  => [
                'name'     => $name,
                'users_id' => $userId
            ],
            'LIMIT'  => 1
        ]);

        if ($row = $result->current()) {
            return $row['value'];
        }

        $result = $DB->request([
            'SELECT' => ['value'],
            'FROM'   => $table,
            'WHERE'  => [
                'name'     => $name,
                'users_id' => 0
            ],
            'LIMIT'  => 1
        ]);

        if ($row = $result->current()) {
            return $row['value'];
        }

        return $default;
    }

    public static function set(string $name, $value): bool
    {
        global $DB;

        $userId = $_SESSION['glpiID'] ?? 0;
        $table = self::getTable();

        $result = $DB->request([
            'COUNT'  => 'cnt',
            'FROM'   => $table,
            'WHERE'  => [
                'name'     => $name,
                'users_id' => $userId
            ]
        ]);

        $count = $result->current()['cnt'] ?? 0;

        if ($count > 0) {
            return $DB->update($table, ['value' => $value], [
                'name'     => $name,
                'users_id' => $userId
            ]);
        }

        return $DB->insert($table, [
            'name'     => $name,
            'users_id' => $userId,
            'value'    => $value
        ]);
    }

    public static function setGlobal(string $name, $value): bool
    {
        global $DB;

        $table = self::getTable();

        $result = $DB->request([
            'COUNT'  => 'cnt',
            'FROM'   => $table,
            'WHERE'  => [
                'name'     => $name,
                'users_id' => 0
            ]
        ]);

        $count = $result->current()['cnt'] ?? 0;

        if ($count > 0) {
            return $DB->update($table, ['value' => $value], [
                'name'     => $name,
                'users_id' => 0
            ]);
        }

        return $DB->insert($table, [
            'name'     => $name,
            'users_id' => 0,
            'value'    => $value
        ]);
    }

    public static function getAll(): array
    {
        global $DB;

        $userId = $_SESSION['glpiID'] ?? 0;
        $table = self::getTable();

        $config = [];

        $result = $DB->request([
            'FROM'  => $table,
            'WHERE' => ['users_id' => 0]
        ]);

        foreach ($result as $row) {
            $config[$row['name']] = $row['value'];
        }

        if ($userId > 0) {
            $result = $DB->request([
                'FROM'  => $table,
                'WHERE' => ['users_id' => $userId]
            ]);

            foreach ($result as $row) {
                $config[$row['name']] = $row['value'];
            }
        }

        return $config;
    }

    /**
     * Get global configuration (for API/backend use)
     * @return array
     */
    public static function getConfig(): array
    {
        global $DB;

        $table = self::getTable();
        $config = [];

        $result = $DB->request([
            'FROM'  => $table,
            'WHERE' => ['users_id' => 0]
        ]);

        foreach ($result as $row) {
            $config[$row['name']] = $row['value'];
        }

        // Ensure numeric values for limits
        $config['query_default_limit'] = (int)($config['query_default_limit'] ?? 1000);
        $config['query_max_limit'] = (int)($config['query_max_limit'] ?? 10000);
        $config['query_timeout'] = (int)($config['query_timeout'] ?? 30);

        return $config;
    }

    public function showConfigForm(): void
    {
        if (!Session::haveRight(self::$rightname, UPDATE)) {
            return;
        }

        $config = self::getAll();

        echo '<div class="container mt-4">';
        echo '<div class="card">';
        echo '<div class="card-header">';
        echo '<h3 class="card-title">' . __('Dashboard NG Configuration', 'dashboardng') . '</h3>';
        echo '</div>';
        echo '<div class="card-body">';

        echo '<form method="post" action="' . $_SERVER['REQUEST_URI'] . '">';
        echo Html::hidden('_glpi_csrf_token', ['value' => Session::getNewCSRFToken()]);

        echo '<div class="mb-3 row">';
        echo '<label class="col-sm-3 col-form-label">' . __('Refresh Interval (seconds)', 'dashboardng') . '</label>';
        echo '<div class="col-sm-9">';
        echo '<input type="number" class="form-control" name="refresh_interval" value="' . ($config['refresh_interval'] ?? 60) . '" min="10" max="600">';
        echo '</div></div>';

        echo '<div class="mb-3 row">';
        echo '<label class="col-sm-3 col-form-label">' . __('Default Period', 'dashboardng') . '</label>';
        echo '<div class="col-sm-9">';
        echo '<select class="form-select" name="default_period">';
        $periods = [
            0 => __('Total', 'dashboardng'),
            1 => __('Current year', 'dashboardng'),
            2 => __('Current month', 'dashboardng'),
            3 => __('Last week', 'dashboardng'),
            4 => __('Last 15 days', 'dashboardng'),
            5 => __('Last 30 days', 'dashboardng'),
            6 => __('Last 90 days', 'dashboardng'),
            7 => __('Last 180 days', 'dashboardng'),
        ];
        foreach ($periods as $key => $label) {
            $selected = ($config['default_period'] ?? 0) == $key ? ' selected' : '';
            echo "<option value=\"$key\"$selected>$label</option>";
        }
        echo '</select>';
        echo '</div></div>';

        // Query Limits Section
        echo '<hr class="my-4">';
        echo '<h5 class="mb-3">' . __('Query Limits (for custom widgets)', 'dashboardng') . '</h5>';

        echo '<div class="mb-3 row">';
        echo '<label class="col-sm-3 col-form-label">' . __('Default Row Limit', 'dashboardng') . '</label>';
        echo '<div class="col-sm-9">';
        echo '<input type="number" class="form-control" name="query_default_limit" value="' . ($config['query_default_limit'] ?? 1000) . '" min="10" max="10000">';
        echo '<small class="form-text text-muted">' . __('Default number of rows returned by custom widget queries', 'dashboardng') . '</small>';
        echo '</div></div>';

        echo '<div class="mb-3 row">';
        echo '<label class="col-sm-3 col-form-label">' . __('Maximum Row Limit', 'dashboardng') . '</label>';
        echo '<div class="col-sm-9">';
        echo '<input type="number" class="form-control" name="query_max_limit" value="' . ($config['query_max_limit'] ?? 10000) . '" min="100" max="100000">';
        echo '<small class="form-text text-muted">' . __('Maximum allowed rows per query (for performance)', 'dashboardng') . '</small>';
        echo '</div></div>';

        echo '<div class="mb-3 row">';
        echo '<label class="col-sm-3 col-form-label">' . __('Query Timeout (seconds)', 'dashboardng') . '</label>';
        echo '<div class="col-sm-9">';
        echo '<input type="number" class="form-control" name="query_timeout" value="' . ($config['query_timeout'] ?? 30) . '" min="5" max="300">';
        echo '<small class="form-text text-muted">' . __('Maximum query execution time before timeout', 'dashboardng') . '</small>';
        echo '</div></div>';

        echo '<div class="d-flex justify-content-end">';
        echo '<button type="submit" name="update" class="btn btn-primary">' . __('Save') . '</button>';
        echo '</div>';

        echo '</form>';
        echo '</div></div></div>';
    }
}
