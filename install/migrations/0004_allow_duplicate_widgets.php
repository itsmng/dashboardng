<?php

final class PluginDashboardngMigration0004AllowDuplicateWidgets extends \GlpiPlugin\Dashboardng\Migration\AbstractDashboardngMigration
{
    public const VERSION = '0004';

    public function upgrade(\Migration $migration): void
    {
        $migration->dropKey('glpi_plugin_dashboardng_dashboard_widgets', 'unique_dashboard_widget');
        $migration->executeMigration();
    }
}
