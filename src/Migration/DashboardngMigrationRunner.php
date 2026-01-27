<?php

namespace GlpiPlugin\Dashboardng\Migration;


final class DashboardngMigrationRunner
{
    public const CONFIG_CONTEXT = 'dashboardng';
    public const CONFIG_KEY = 'schema_version';

    /**
     * Latest schema version bundled with this plugin.
     *
     * This must match the highest migration VERSION.
     */
    public const LATEST_SCHEMA_VERSION = '0004';

    public static function getInstalledSchemaVersion(): string
    {
        $config = \Config::getConfigurationValues(self::CONFIG_CONTEXT, [self::CONFIG_KEY]);
        $version = $config[self::CONFIG_KEY] ?? '0000';

        if (!is_string($version) || $version === '') {
            return '0000';
        }

        return $version;
    }

    public static function setInstalledSchemaVersion(string $version): void
    {
        \Config::setConfigurationValues(self::CONFIG_CONTEXT, [self::CONFIG_KEY => $version]);
    }

    /**
     * Set schema version to latest on fresh installs.
     * This ensures migrations are not executed on new installs.
     */
    public static function markInstalledAsLatest(): void
    {
        self::setInstalledSchemaVersion(self::LATEST_SCHEMA_VERSION);
    }

    public static function runPendingMigrations(\Migration $migration): void
    {
        $currentSchemaVersion = self::getInstalledSchemaVersion();
        $migrations = self::loadMigrations();

        foreach ($migrations as $migrationVersion => $migrationInstance) {
            if (strcmp($migrationVersion, $currentSchemaVersion) <= 0) {
                continue;
            }

            $migration->addNewMessageArea('DashboardNG migration ' . $migrationVersion);
            $migrationInstance->upgrade($migration);
            self::setInstalledSchemaVersion($migrationVersion);
            $currentSchemaVersion = $migrationVersion;
        }
    }

    /**
     * @return array<string, AbstractDashboardngMigration>
     */
    private static function loadMigrations(): array
    {
        $dir = dirname(__DIR__, 2) . '/install/migrations';
        $files = glob($dir . '/[0-9][0-9][0-9][0-9]_*.php') ?: [];
        sort($files, SORT_STRING);

        $migrations = [];

        foreach ($files as $file) {
            require_once $file;

            $baseName = basename($file, '.php');
            $version = substr($baseName, 0, 4);
            $className = self::migrationClassNameFromFile($baseName);

            if (!class_exists($className)) {
                continue;
            }

            $instance = new $className();
            if (!$instance instanceof AbstractDashboardngMigration) {
                continue;
            }

            $migrations[$version] = $instance;
        }

        ksort($migrations, SORT_STRING);
        return $migrations;
    }

    private static function migrationClassNameFromFile(string $baseName): string
    {
        $version = substr($baseName, 0, 4);
        $suffix = substr($baseName, 5);

        $suffixParts = preg_split('/[^a-zA-Z0-9]+/', $suffix) ?: [];
        $suffixParts = array_values(array_filter($suffixParts, static fn($p) => $p !== ''));

        $suffixPascal = '';
        foreach ($suffixParts as $part) {
            $suffixPascal .= ucfirst(strtolower($part));
        }

        return 'PluginDashboardngMigration' . $version . $suffixPascal;
    }
}
