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
            'charts.php' => 'charts',
            'metrics.php' => 'metrics',
            'assets.php' => 'assets',
            'config.form.php' => 'config',
        ];

        $page = $pageMap[$script] ?? 'dashboard';

        if ($page === 'reports' && isset($queryParams['type']) && $queryParams['type'] === 'metrics') {
            $page = 'metrics';
        }

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
            'icon' => 'fa fa-life-ring',
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

        $chartsColumns = [
            [
                ['header' => __('General Charts', 'dashboardng')],
                ['label' => __('Assets'), 'page' => 'charts', 'type' => 'assets', 'icon' => 'fa fa-desktop'],
                ['label' => __('Category'), 'page' => 'charts', 'type' => 'category', 'icon' => 'fa fa-tag'],
                ['label' => _sn('Entity', 'Entities', 2), 'page' => 'charts', 'type' => 'entities', 'icon' => 'fa fa-sitemap'],
                ['label' => __('Overall', 'dashboardng'), 'page' => 'charts', 'type' => 'overall', 'icon' => 'fa fa-line-chart'],
                ['label' => _sn('Group', 'Groups', 2), 'page' => 'charts', 'type' => 'groups', 'icon' => 'fa fa-users'],
                ['label' => _n('Location', 'Locations', 2), 'page' => 'charts', 'type' => 'locations', 'icon' => 'fa fa-map-marker'],
                ['label' => __('Requester', 'dashboardng'), 'page' => 'charts', 'type' => 'requester', 'icon' => 'fa fa-user-o'],
                ['label' => __('Satisfaction', 'dashboardng'), 'page' => 'charts', 'type' => 'satisfaction', 'icon' => 'fa fa-smile-o'],
                ['label' => __('Technician', 'dashboardng'), 'page' => 'charts', 'type' => 'technician', 'icon' => 'fa fa-user'],
                ['label' => __('Time range'), 'page' => 'charts', 'type' => 'times', 'icon' => 'fa fa-calendar'],
            ],
            [
                ['header' => __('by Category', 'dashboardng'), 'page' => 'charts', 'type' => 'by-category', 'icon' => 'fa fa-tag'],
                ['label' => __('by Date', 'dashboardng'), 'page' => 'charts', 'type' => 'by-date', 'icon' => 'fa fa-calendar'],
                ['label' => __('by Entity', 'dashboardng'), 'page' => 'charts', 'type' => 'by-entity', 'icon' => 'fa fa-sitemap'],
                ['label' => __('by Group', 'dashboardng'), 'page' => 'charts', 'type' => 'by-group', 'icon' => 'fa fa-users'],
                ['label' => __('by Location', 'dashboardng'), 'page' => 'charts', 'type' => 'by-location', 'icon' => 'fa fa-map-marker'],
                ['label' => __('by Requester', 'dashboardng'), 'page' => 'charts', 'type' => 'by-requester', 'icon' => 'fa fa-user-o'],
                ['label' => __('by Technician', 'dashboardng'), 'page' => 'charts', 'type' => 'by-technician', 'icon' => 'fa fa-user'],
                ['label' => __('by Type', 'dashboardng'), 'page' => 'charts', 'type' => 'by-type', 'icon' => 'fa fa-list'],
                ['divider' => true],
                [
                    'header' => __('SLA', 'dashboardng'),
                    'icon' => 'fa fa-clock-o',
                    'submenu' => [
                        ['label' => __('Time to own'), 'page' => 'charts', 'type' => 'sla-tto', 'icon' => 'fa fa-hourglass-o'],
                        ['label' => __('Time to resolve'), 'page' => 'charts', 'type' => 'sla-ttr', 'icon' => 'fa fa-hourglass-end'],
                    ]
                ],
                [
                    'header' => __('OLA'),
                    'icon' => 'fa fa-clock-o',
                    'submenu' => [
                        ['label' => __('Time to own'), 'page' => 'charts', 'type' => 'ola-tto', 'icon' => 'fa fa-hourglass-o'],
                        ['label' => __('Time to resolve'), 'page' => 'charts', 'type' => 'ola-ttr', 'icon' => 'fa fa-hourglass-end'],
                    ]
                ],
            ],
        ];

        $items[] = [
            'kind' => 'mega',
            'label' => __('Charts', 'dashboardng'),
            'icon' => 'fa fa-chart-bar',
            'active' => self::isActive('charts'),
            'columns' => $chartsColumns,
        ];

        $items[] = [
            'kind' => 'dropdown',
            'label' => __('Metrics', 'dashboardng'),
            'icon' => 'fa fa-chart-line',
            'active' => self::isActive('metrics'),
            'items' => [
                [
                    'label' => __('Overall', 'dashboardng'),
                    'icon' => 'fa fa-line-chart',
                    'page' => 'reports',
                    'type' => 'metrics-overall',
                    'active' => self::isTypeActive('metrics-overall'),
                ],
                [
                    'label' => __('by Entity', 'dashboardng'),
                    'icon' => 'fa fa-sitemap',
                    'page' => 'reports',
                    'type' => 'metrics-entity',
                    'active' => self::isTypeActive('metrics-entity'),
                ],
                [
                    'label' => __('by Group', 'dashboardng'),
                    'icon' => 'fa fa-users',
                    'page' => 'reports',
                    'type' => 'metrics-group',
                    'active' => self::isTypeActive('metrics-group'),
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
