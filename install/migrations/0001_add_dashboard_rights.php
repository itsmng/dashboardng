<?php

final class PluginDashboardngMigration0001AddDashboardRights extends \GlpiPlugin\Dashboardng\Migration\AbstractDashboardngMigration
{
    public const VERSION = '0001';

    public function upgrade(\Migration $migration): void
    {
        if (!defined('UPDATE')) {
            define('UPDATE', 2);
        }
        if (!defined('READ')) {
            define('READ', 1);
        }

        // Add new rights with default deny (0) for all profiles
        $migration->addRight('plugin_dashboardng_globaldashboard', 0, []);
        $migration->addRight('plugin_dashboardng_mydashboard', 0, []);

        $profileRight = new \ProfileRight();
        $superAdminProfileId = 4;

        $existingGlobal = \countElementsInTable('glpi_profilerights', [
            'profiles_id' => $superAdminProfileId,
            'name'        => 'plugin_dashboardng_globaldashboard',
        ]);
        if ($existingGlobal === 0) {
            $profileRight->add([
                'profiles_id' => $superAdminProfileId,
                'name'        => 'plugin_dashboardng_globaldashboard',
                'rights'      => UPDATE,
            ]);
        }

        $existingMyDashboard = \countElementsInTable('glpi_profilerights', [
            'profiles_id' => $superAdminProfileId,
            'name'        => 'plugin_dashboardng_mydashboard',
        ]);
        if ($existingMyDashboard === 0) {
            $profileRight->add([
                'profiles_id' => $superAdminProfileId,
                'name'        => 'plugin_dashboardng_mydashboard',
                'rights'      => READ | UPDATE,
            ]);
        }

        $migration->executeMigration();
    }
}
