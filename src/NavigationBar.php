<?php

namespace GlpiPlugin\Dashboardng;

use Session;
use Plugin;

class NavigationBar
{
    private static function getCurrentPage(): string
    {
        $script = basename($_SERVER['PHP_SELF'] ?? '');
        $queryParams = $_GET;

        $pageMap = [
            'dashboard.php' => 'dashboard',
            'mydashboard.php' => 'mydashboard',
            'tickets.php' => 'tickets',
            'reports.php' => 'reports',
            'assets.php' => 'assets',
            'config.form.php' => 'config',
        ];

        $page = $pageMap[$script] ?? 'dashboard';

        return $page;
    }

    private static function getCurrentType(): string
    {
        return $_GET['type'] ?? $_GET['report'] ?? '';
    }

    private static function isActive(string $page): bool
    {
        return self::getCurrentPage() === $page;
    }

    private static function isTypeActive(string $type): bool
    {
        return self::getCurrentType() === $type;
    }

    private static function getUrl(string $page, string $type = ''): string
    {
        $pluginDir = Plugin::getWebDir('dashboardng');
        $url = $pluginDir . '/front/' . $page . '.php';

        if ($type) {
            $url .= '?type=' . htmlspecialchars($type);
        }

        return $url;
    }

    private static function getReportUrl(string $report): string
    {
        $pluginDir = Plugin::getWebDir('dashboardng');
        return $pluginDir . '/front/reports.php?report=' . htmlspecialchars($report);
    }

    public static function getModel(): array
    {
        global $CFG_GLPI;
        
        $currentPage = self::getCurrentPage();
        $currentType = self::getCurrentType();

        $items = [];

        $items[] = [
            'kind' => 'link',
            'label' => __('Dashboard', 'dashboardng'),
            'icon' => 'fa fa-home',
            'url' => self::getUrl('dashboard'),
            'active' => self::isActive('dashboard'),
        ];

        if (Session::haveRight('plugin_dashboardng_mydashboard', UPDATE)) {
            $items[] = [
                'kind' => 'link',
                'label' => __('My Dashboard', 'dashboardng'),
                'icon' => 'fa fa-user-circle',
                'url' => self::getUrl('mydashboard'),
                'active' => self::isActive('mydashboard'),
            ];
        }

        $items[] = [
            'kind' => 'link',
            'label' => __('Tickets', 'dashboardng'),
            'icon' => 'fa fa-ticket-alt',
            'url' => self::getUrl('tickets'),
            'active' => self::isActive('tickets'),
        ];

        $items[] = [
            'kind' => 'dropdown',
            'label' => __('Reports', 'dashboardng'),
            'icon' => 'fa fa-file',
            'active' => self::isActive('assets') || self::isActive('tasks'),
            'items' => [
                [
                    'label' => __('Asset Reports', 'dashboardng'),
                    'icon' => 'fa fa-desktop',
                    'url' => self::getUrl('assets'),
                    'active' => self::isActive('assets'),
                ],
                [
                    'label' => __('Task Reports', 'dashboardng'),
                    'icon' => 'fa fa-tasks',
                    'url' => self::getUrl('tasks'),
                    'active' => self::isActive('tasks'),
                ],
            ],
        ];

        $entity_selector = [
            'enabled' => Session::isMultiEntitiesMode(),
            'current_name' => $_SESSION['glpiactive_entity_name'] ?? '',
            'current_shortname' => $_SESSION['glpiactive_entity_shortname'] ?? '',
            'root_doc' => $CFG_GLPI['root_doc'],
        ];

        return [
            'current_page' => $currentPage,
            'current_type' => $currentType,
            'items' => $items,
            'entity_selector' => $entity_selector,
        ];
    }

    public static function render(): void
    {
        $root = Plugin::getPhpDir('dashboardng', false) . '/templates';
        $vars = self::getModel();
        renderTwigTemplate('components/navigation_bar.twig', $vars, $root);
    }
}
