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

    private static function renderItem(string $label, string $icon, string $page, bool $dropdown = false): string
    {
        $active = self::isActive($page) ? 'active' : '';
        $activeClass = self::isActive($page) ? ' aria-current="page"' : '';

        if ($dropdown) {
            $toggleClass = self::isActive($page) ? 'dropdown-toggle active' : 'dropdown-toggle';
            return '<li class="nav-item dropdown">' .
                '<a class="nav-link ' . $toggleClass . '" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false"' . $activeClass . '>' .
                '<i class="' . $icon . ' me-1"></i>' . $label .
                '</a>';
        }

        return '<li class="nav-item">' .
            '<a class="nav-link ' . $active . '" href="' . self::getUrl($page) . '"' . $activeClass . '>' .
            '<i class="' . $icon . ' me-1"></i>' . $label .
            '</a>' .
            '</li>';
    }

    private static function renderDropdownItem(string $label, string $page, string $type = '', bool $isSubmenu = false, string $icon = ''): string
    {
        $active = $type ? self::isTypeActive($type) : self::isActive($page);
        $activeClass = $active ? 'active' : '';

        $iconHtml = $icon ? '<i class="' . $icon . ' me-1"></i>' : '';

        if ($isSubmenu) {
            return '<li><a class="dropdown-item ' . $activeClass . '" href="' . self::getUrl($page, $type) . '">' . $iconHtml . $label . '</a></li>';
        }

        return '<li><a class="dropdown-item ' . $activeClass . '" href="' . self::getUrl($page, $type) . '">' . $iconHtml . $label . '</a></li>';
    }

    private static function renderSubmenu(string $label, array $items, string $icon = ''): string
    {
        $html = '<li class="dropdown-submenu dropend">';
        $iconHtml = $icon ? '<i class="' . $icon . ' me-1"></i>' : '';
        $html .= '<a class="dropdown-item dropdown-toggle" href="#">' . $iconHtml . $label . '</a>';
        $html .= '<ul class="dropdown-menu">';

        foreach ($items as $item) {
            if (isset($item['report'])) {
                $url = self::getReportUrl($item['report']);
                $activeItem = self::isTypeActive($item['report']) ? 'active' : '';
                $itemIcon = $item['icon'] ?? '';
                $iconHtml = $itemIcon ? '<i class="' . $itemIcon . ' me-1"></i>' : '';
                $html .= '<li><a class="dropdown-item ' . $activeItem . '" href="' . $url . '">' . $iconHtml . $item['label'] . '</a></li>';
            } else {
                $html .= self::renderDropdownItem($item['label'], $item['page'], $item['type'] ?? '', true, $item['icon'] ?? '');
            }
        }

        $html .= '</ul></li>';
        return $html;
    }

    private static function renderMegaMenu(string $label, string $icon, array $columns, string $page): string
    {
        $active = self::isActive($page) ? 'active' : '';
        $activeClass = self::isActive($page) ? ' aria-current="page"' : '';

        $html = '<li class="nav-item dropdown mega-menu">';
        $html .= '<a class="nav-link dropdown-toggle ' . $active . '" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false"' . $activeClass . '>';
        $html .= '<i class="' . $icon . ' me-1"></i>' . $label . '</a>';
        $html .= '<ul class="dropdown-menu mega-dropdown">';
        $html .= '<li><div class="container-fluid"><div class="row">';

        $colClass = count($columns) === 2 ? 'col-md-6' : 'col-md-4';
        if (count($columns) === 1) {
            $colClass = 'col-md-12';
        }

        foreach ($columns as $column) {
            $html .= '<div class="' . $colClass . '">';
            $html .= '<ul class="list-unstyled">';
            foreach ($column as $item) {
                if (isset($item['submenu'])) {
                    $label = $item['label'] ?? $item['header'] ?? '';
                    $icon = $item['icon'] ?? '';
                    $html .= self::renderSubmenu($label, $item['submenu'], $icon);
                } elseif (isset($item['divider']) && $item['divider']) {
                    $html .= '<li><hr class="dropdown-divider"></li>';
                } elseif (isset($item['header'])) {
                    $html .= '<li class="dropdown-header">' . $item['header'] . '</li>';
                } else {
                    $url = isset($item['report']) ? self::getReportUrl($item['report']) : self::getUrl($item['page'], $item['type'] ?? '');
                    $activeItem = (isset($item['type']) && self::isTypeActive($item['type'])) ||
                                  (isset($item['report']) && self::isTypeActive($item['report'])) ? 'active' : '';
                    $itemIcon = $item['icon'] ?? '';
                    $iconHtml = $itemIcon ? '<i class="' . $itemIcon . ' me-1"></i>' : '';
                    $html .= '<li><a class="dropdown-item ' . $activeItem . '" href="' . $url . '">' . $iconHtml . $item['label'] . '</a></li>';
                }
            }
            $html .= '</ul></div>';
        }

        $html .= '</div></div></li></ul></li>';
        return $html;
    }

    public static function render(): void
    {
        $currentPage = self::getCurrentPage();

        echo '<nav class="navbar navbar-expand-lg navbar-dark dashboardng-navbar">';
        echo '<div class="container-fluid">';

        echo '<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#dashboardngNavbar" aria-controls="dashboardngNavbar" aria-expanded="false" aria-label="Toggle navigation">';
        echo '<span class="navbar-toggler-icon"></span>';
        echo '</button>';

        echo '<div class="collapse navbar-collapse" id="dashboardngNavbar">';
        echo '<ul class="navbar-nav me-auto">';

        echo self::renderItem(
            __('Dashboard', 'dashboardng'),
            'fa fa-home',
            'dashboard'
        );

        echo self::renderItem(
            __('My Dashboard', 'dashboardng'),
            'fa fa-user-circle',
            'mydashboard'
        );

        echo self::renderItem(
            __('Tickets', 'dashboardng'),
            'fa fa-life-ring',
            'tickets'
        );

        // Reports menu - direct links to dedicated pages
        $reportsActive = self::isActive('assets') || self::isActive('tasks') ? 'active' : '';
        echo '<li class="nav-item dropdown">';
        echo '<a class="nav-link dropdown-toggle ' . $reportsActive . '" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">';
        echo '<i class="fa fa-file me-1"></i>' . __('Reports', 'dashboardng');
        echo '</a>';
        echo '<ul class="dropdown-menu">';
        echo self::renderDropdownItem(__('Asset Reports', 'dashboardng'), 'assets', '', false, 'fa fa-desktop');
        echo self::renderDropdownItem(__('Task Reports', 'dashboardng'), 'tasks', '', false, 'fa fa-tasks');
        echo '</ul></li>';

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
                ['header' => __('SLA', 'dashboardng'), 'icon' => 'fa fa-clock-o',
                 'submenu' => [
                     ['label' => __('Time to own'), 'page' => 'charts', 'type' => 'sla-tto', 'icon' => 'fa fa-hourglass-o'],
                     ['label' => __('Time to resolve'), 'page' => 'charts', 'type' => 'sla-ttr', 'icon' => 'fa fa-hourglass-end'],
                ]],
                ['header' => __('OLA'), 'icon' => 'fa fa-clock-o',
                 'submenu' => [
                     ['label' => __('Time to own'), 'page' => 'charts', 'type' => 'ola-tto', 'icon' => 'fa fa-hourglass-o'],
                     ['label' => __('Time to resolve'), 'page' => 'charts', 'type' => 'ola-ttr', 'icon' => 'fa fa-hourglass-end'],
                ]],
            ],
        ];

        echo self::renderMegaMenu(
            __('Charts', 'dashboardng'),
            'fa fa-chart-bar',
            $chartsColumns,
            'charts'
        );

        $metricsActive = self::isActive('metrics') ? 'active' : '';
        echo '<li class="nav-item dropdown">';
        echo '<a class="nav-link dropdown-toggle ' . $metricsActive . '" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">';
        echo '<i class="fa fa-chart-line me-1"></i>' . __('Metrics', 'dashboardng');
        echo '</a>';
        echo '<ul class="dropdown-menu">';
        echo self::renderDropdownItem(__('Overall', 'dashboardng'), 'reports', 'metrics-overall', false, 'fa fa-line-chart');
        echo self::renderDropdownItem(__('by Entity', 'dashboardng'), 'reports', 'metrics-entity', false, 'fa fa-sitemap');
        echo self::renderDropdownItem(__('by Group', 'dashboardng'), 'reports', 'metrics-group', false, 'fa fa-users');
        echo '</ul></li>';

        echo '</ul>';
        echo '</div>';
        echo '</div>';
        echo '</nav>';
    }
}
