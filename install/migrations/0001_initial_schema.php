<?php

final class PluginDashboardngMigration0001InitialSchema extends \GlpiPlugin\Dashboardng\Migration\AbstractDashboardngMigration
{
    public const VERSION = '0001';

    public function upgrade(\Migration $migration): void
    {
        $this->createConfigTable($migration);
        $this->createDashboardsTable($migration);
        $this->createWidgetDefinitionsTable($migration);
        $this->createDashboardWidgetsTable($migration);
        $this->createProfilesTable($migration);

        $migration->executeMigration();
    }

    private function createConfigTable(\Migration $migration): void
    {
        $table = 'glpi_plugin_dashboardng_config';

        $query = <<<SQL
            CREATE TABLE IF NOT EXISTS `$table` (
                `id` INT(11) NOT NULL AUTO_INCREMENT,
                `users_id` INT(11) NOT NULL DEFAULT 0,
                `name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
                `value` TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                PRIMARY KEY (`id`),
                KEY `users_id` (`users_id`),
                KEY `name` (`name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        SQL;

        $migration->addPreQuery($query);
    }

    private function createDashboardsTable(\Migration $migration): void
    {
        $table = 'glpi_plugin_dashboardng_dashboards';

        $query = <<<SQL
            CREATE TABLE IF NOT EXISTS `$table` (
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

        $migration->addPreQuery($query);
    }

    private function createWidgetDefinitionsTable(\Migration $migration): void
    {
        $table = 'glpi_plugin_dashboardng_widget_definitions';

        $query = <<<SQL
            CREATE TABLE IF NOT EXISTS `$table` (
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

        $migration->addPreQuery($query);
    }

    private function createDashboardWidgetsTable(\Migration $migration): void
    {
        $table = 'glpi_plugin_dashboardng_dashboard_widgets';

        $query = <<<SQL
            CREATE TABLE IF NOT EXISTS `$table` (
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

        $migration->addPreQuery($query);
    }

    private function createProfilesTable(\Migration $migration): void
    {
        $table = 'glpi_plugin_dashboardng_profiles';

        $query = <<<SQL
            CREATE TABLE IF NOT EXISTS `$table` (
                `id` INT(11) NOT NULL AUTO_INCREMENT,
                `name` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        SQL;

        $migration->addPreQuery($query);
    }
}
