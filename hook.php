<?php

use GlpiPlugin\Dashboardng\PluginDashboardngConfig;
use GlpiPlugin\Dashboardng\PluginDashboardngProfile;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboard;
use GlpiPlugin\Dashboardng\PluginDashboardngWidgetDefinition;
use GlpiPlugin\Dashboardng\PluginDashboardngDashboardWidget;

/**
 * Plugin installation
 *
 * @return boolean
 */
function plugin_dashboardng_install()
{
    global $DB;

    if (!PluginDashboardngConfig::install()) {
        return false;
    }

    if (!PluginDashboardngProfile::install()) {
        return false;
    }

    $dashboardId = PluginDashboardngDashboard::install();
    if ($dashboardId === false) {
        return false;
    }

    if (!PluginDashboardngWidgetDefinition::install()) {
        return false;
    }

    if (!PluginDashboardngDashboardWidget::install($dashboardId)) {
        return false;
    }

    // Grant full access to Super-Admin profile
    $profileRight = new ProfileRight();
    $superAdminProfileId = 4; // Default Super-Admin profile ID

    // Check if rights already exist
    $existingConfig = countElementsInTable('glpi_profilerights', [
        'profiles_id' => $superAdminProfileId,
        'name' => 'plugin_dashboardng_config'
    ]);
    if ($existingConfig === 0) {
        $profileRight->add([
            'profiles_id' => $superAdminProfileId,
            'name' => 'plugin_dashboardng_config',
            'rights' => UPDATE,
        ]);
    }

    $existingAccess = countElementsInTable('glpi_profilerights', [
        'profiles_id' => $superAdminProfileId,
        'name' => 'plugin_dashboardng_access'
    ]);
    if ($existingAccess === 0) {
        $profileRight->add([
            'profiles_id' => $superAdminProfileId,
            'name' => 'plugin_dashboardng_access',
            'rights' => READ | UPDATE,
        ]);
    }

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

    return true;
}
