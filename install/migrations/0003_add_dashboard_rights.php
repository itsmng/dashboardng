<?php

final class PluginDashboardngMigration0003AddDashboardRights extends \GlpiPlugin\Dashboardng\Migration\AbstractDashboardngMigration
{
    public const VERSION = '0003';

    public function upgrade(\Migration $migration): void
    {
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
