<?php

namespace GlpiPlugin\Dashboardng;

use CommonDBTM;
use CommonGLPI;
use Html;
use Profile;
use ProfileRight;
use Session;

if (!defined('READ')) {
    define('READ', 1);
}
if (!defined('UPDATE')) {
    define('UPDATE', 2);
}

/**
 * Profile Rights Management
 */
class PluginDashboardngProfile extends CommonDBTM
{
    public static $rightname = 'profile';

    /**
     * Install database table
     *
     * @return boolean
     */
    public static function install(): bool
    {
        return true;
    }

    /**
     * Uninstall database table
     *
     * @return boolean
     */
    public static function uninstall(): bool
    {
        return true;
    }

    public static function getTable($classname = null): string
    {
        return 'glpi_plugin_dashboardng_profiles';
    }

    /**
     * Get rights definition
     *
     * @return array
     */
    public static function getRightsGeneral(): array
    {
        return [
            [
                'itemtype' => self::class,
                'label'    => __('Configuration', 'dashboardng'),
                'field'    => 'plugin_dashboardng_config',
                'rights'   => [UPDATE => __('Update')],
            ],
            [
                'itemtype' => self::class,
                'label'    => __('Dashboard Access', 'dashboardng'),
                'field'    => 'plugin_dashboardng_access',
                'rights'   => [
                    READ   => __('Read'),
                    UPDATE => __('Update'),
                ],
            ],
            [
                'itemtype' => self::class,
                'label'    => __('Global Dashboard Edit', 'dashboardng'),
                'field'    => 'plugin_dashboardng_globaldashboard',
                'rights'   => [UPDATE => __('Update')],
            ],
            [
                'itemtype' => self::class,
                'label'    => __('My Dashboard', 'dashboardng'),
                'field'    => 'plugin_dashboardng_mydashboard',
                'rights'   => [
                    READ   => __('Read'),
                    UPDATE => __('Update'),
                ],
            ],
        ];
    }

    /**
     * Change profile handler
     *
     * @return void
     */
    public static function changeProfile(): void
    {
    }

    /**
     * Add default profile rights
     *
     * @param int $profiles_id Profile ID
     * @param array $rights Rights to add
     * @return void
     */
    public static function addDefaultProfileInfos(int $profiles_id, array $rights): void
    {
        $profileRight = new ProfileRight();

        foreach ($rights as $right => $value) {
            if (!countElementsInTable('glpi_profilerights', [
                'profiles_id' => $profiles_id,
                'name'        => $right
            ])) {
                $profileRight->add([
                    'profiles_id' => $profiles_id,
                    'name'        => $right,
                    'rights'      => $value,
                ]);

                $_SESSION['glpiactiveprofile'][$right] = $value;
            }
        }
    }

    /**
     * Get tab name for profile page
     *
     * @param CommonGLPI $item
     * @param int $withtemplate
     * @return string
     */
    public function getTabNameForItem(CommonGLPI $item, $withtemplate = 0): string
    {
        if (Session::haveRight('profile', UPDATE) && $item->getType() === 'Profile') {
            return __('Dashboard NG', 'dashboardng');
        }

        return '';
    }

    /**
     * Display tab content for profile page
     *
     * @param CommonGLPI $item
     * @param int $tabnum
     * @param int $withtemplate
     * @return boolean
     */
    public static function displayTabContentForItem(CommonGLPI $item, $tabnum = 1, $withtemplate = 0): bool
    {
        if ($item->getType() === 'Profile') {
            $profileId = $item->getID();
            $profile = new self();

            foreach (self::getRightsGeneral() as $right) {
                self::addDefaultProfileInfos($profileId, [$right['field'] => 0]);
            }

            $profile->showForm($profileId);
        }

        return true;
    }

    /**
     * Display profile form
     *
     * @param int $profiles_id Profile ID
     * @param boolean $openform Open form tag
     * @param boolean $closeform Close form tag
     * @return void
     */
    public function showForm(int $profiles_id = 0, bool $openform = true, bool $closeform = true): void
    {
        if (!Session::haveRight('profile', READ)) {
            return;
        }

        echo '<div class="firstbloc">';

        if (($canedit = Session::haveRight('profile', UPDATE)) && $openform) {
            $profile = new Profile();
            echo '<form method="post" action="' . $profile->getFormURL() . '">';
        }

        $profile = new Profile();
        $profile->getFromDB($profiles_id);
        $rights = self::getRightsGeneral();
        $profile->displayRightsChoiceMatrix($rights, [
            'default_class' => 'tab_bg_2',
            'title'         => __('Dashboard NG', 'dashboardng')
        ]);

        if ($canedit && $closeform) {
            echo '<div class="center">';
            echo Html::hidden('id', ['value' => $profiles_id]);
            echo Html::submit(_sx('button', 'Save'), ['name' => 'update']);
            echo '</div>';
            Html::closeForm();
        }

        echo '</div>';
    }
}
