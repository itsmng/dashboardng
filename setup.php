<?php

global $CFG_GLPI;

define('DASHBOARDNG_VERSION', '1.1.10');
define('DASHBOARDNG_ITSMNG_MIN_VERSION', '2.0');

$hostLoader = require __DIR__ . '/../../vendor/autoload.php';
$hostLoader->addPsr4('GlpiPlugin\\Dashboardng\\', __DIR__ . '/src/');

use GlpiPlugin\Dashboardng\DashboardMenu;
use GlpiPlugin\Dashboardng\PluginDashboardngProfile;
use GlpiPlugin\Dashboardng\PluginDashboardngConfig;

/**
 * Define the plugin's version and informations
 *
 * @return array [name, version, author, homepage, license, minGlpiVersion]
 */
function plugin_version_dashboardng()
{
    return [
        'name'           => 'Dashboard NG',
        'version'        => DASHBOARDNG_VERSION,
        'author'         => 'ITSMNG Team, Théodore Clément',
        'homepage'       => 'https://github.com/itsmng/dashboardng',
        'license'        => '<a href="../plugins/dashboardng/LICENSE" target="_blank">GPLv3</a>',
    ];
}

/**
 * Initialize all classes and generic variables of the plugin
 */
function plugin_init_dashboardng()
{
    global $PLUGIN_HOOKS, $CFG_GLPI;

    $PLUGIN_HOOKS['csrf_compliant']['dashboardng'] = true;

    if (str_contains($_SERVER['REQUEST_URI'], '/plugins/dashboardng/')) {
        $PLUGIN_HOOKS['add_javascript']['dashboardng'] = [
            '/node_modules/preact/dist/preact.min.umd.js',
            '/node_modules/preact/hooks/dist/hooks.umd.js',
            '/node_modules/htm/dist/htm.umd.js',
            '/node_modules/chart.js/dist/chart.umd.js',
        ];

        $PLUGIN_HOOKS['add_css']['dashboardng'] = [
            '/node_modules/gridstack/dist/gridstack.min.css',
            '/css/navbar.css',
            '/css/dashboard.css',
        ];
    }

    $CFG_GLPI['javascript']['plugins'][DashboardMenu::class] = 'gridstack';

    Plugin::registerClass(PluginDashboardngProfile::class, ['addtabon' => Profile::class]);
    $PLUGIN_HOOKS['change_profile']['dashboardng'] = [PluginDashboardngProfile::class, 'changeProfile'];

    if (Session::haveRight('plugin_dashboardng_config', UPDATE)) {
        $PLUGIN_HOOKS['config_page']['dashboardng'] = 'front/config.form.php';
    }

    if (Session::haveRight('plugin_dashboardng_access', READ)) {
        $PLUGIN_HOOKS['menu_toadd']['dashboardng']['plugins'] = DashboardMenu::class;
    }
}

/**
 * Check plugin's prerequisites before installation
 *
 * @return boolean
 */
function dashboardng_check_prerequisites()
{
    $prerequisitesSuccess = true;

    if (version_compare(ITSM_VERSION, DASHBOARDNG_ITSMNG_MIN_VERSION, 'lt')) {
        echo "This plugin requires ITSM >= " . DASHBOARDNG_ITSMNG_MIN_VERSION . "<br>";
        $prerequisitesSuccess = false;
    }

    if (!is_readable(__DIR__ . '/vendor/autoload.php') || !is_file(__DIR__ . '/vendor/autoload.php')) {
        echo "Run 'composer install --no-dev' in the plugin directory<br>";
        return false;
    }

    if (!is_dir(__DIR__ . '/node_modules') || !is_readable(__DIR__ . '/node_modules')) {
        echo "Run 'npm install' in the plugin directory<br>";
        $prerequisitesSuccess = false;
    }

    return $prerequisitesSuccess;
}

function dashboardng_check_config($verbose = false)
{
    if ($verbose) {
        echo "Checking plugin configuration<br>";
    }
    return true;
}
