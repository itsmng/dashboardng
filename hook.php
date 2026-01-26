<?php

use GlpiPlugin\Dashboardng\PluginDashboardngConfig;
use GlpiPlugin\Dashboardng\PluginDashboardngProfile;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngWidgetDefinition;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;
use GlpiPlugin\Dashboardng\Migration\DashboardngMigrationRunner;
use GlpiPlugin\Dashboardng\Cache\QueryCacheManager;
use GlpiPlugin\Dashboardng\DataSources\GenericDataSource;
use Plugin;
use Config;
use CommonDBTM;

/**
 * Plugin installation
 *
 * @return boolean
 */
function plugin_dashboardng_install()
{
    $migration = new Migration('0.0.0');
    DashboardngMigrationRunner::runPendingMigrations($migration);

    return true;
}

/**
 * Plugin uninstallation
 *
 * @return boolean
 */
function plugin_dashboardng_uninstall()
{
    global $DB;

    if (!PluginDashboardngConfig::uninstall()) {
        return false;
    }

    if (!PluginDashboardngProfile::uninstall()) {
        return false;
    }

    if (!PluginDashboardngDashboardWidget::uninstall()) {
        return false;
    }

    if (!PluginDashboardngWidgetDefinition::uninstall()) {
        return false;
    }

    if (!PluginDashboardngDashboard::uninstall()) {
        return false;
    }

    // Remove profile rights
    $DB->delete('glpi_profilerights', [
        'name' => ['LIKE', 'plugin_dashboardng_%']
    ]);

    // Remove migration version tracking
    Config::deleteConfigurationValues(
        DashboardngMigrationRunner::CONFIG_CONTEXT,
        [DashboardngMigrationRunner::CONFIG_KEY]
    );

    return true;
}

/**
 * Plugin update migration
 *
 * @param string $current_version Current version
 * @return boolean
 */
function plugin_dashboardng_update($current_version)
{
    $migration = new Migration($current_version);
    DashboardngMigrationRunner::runPendingMigrations($migration);

    return true;
}

/**
 * Invalidate cache after item update
 *
 * @param CommonDBTM $item
 * @return void
 */
function plugin_dashboardng_post_update_item(CommonDBTM $item)
{
    if (!Toolbox::useCache()) {
        return;
    }

    $cacheManager = new QueryCacheManager();
    $itemtype = get_class($item);
    $cacheManager->invalidateItemtype($itemtype);

    $allowedItemtypes = GlpiPlugin\Dashboardng\Registry\ItemtypeRegistry::getAllowedItemtypes();

    if (!in_array($itemtype, $allowedItemtypes, true)) {
        return;
    }
}

/**
 * Invalidate cache after item delete
 *
 * @param CommonDBTM $item
 * @return void
 */
function plugin_dashboardng_post_delete_item(CommonDBTM $item)
{
    if (!Toolbox::useCache()) {
        return;
    }

    $cacheManager = new QueryCacheManager();
    $itemtype = get_class($item);
    $cacheManager->invalidateItemtype($itemtype);
}

/**
 * Invalidate cache after item creation
 *
 * @param CommonDBTM $item
 * @return void
 */
function plugin_dashboardng_post_add_item(CommonDBTM $item)
{
    if (!Toolbox::useCache()) {
        return;
    }

    $cacheManager = new QueryCacheManager();
    $itemtype = get_class($item);
    $cacheManager->invalidateItemtype($itemtype);
}
