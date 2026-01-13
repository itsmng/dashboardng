<?php

/**
 * Dashboard NG Plugin - Charts Page
 *
 * Various chart visualizations (Coming Soon)
 */

namespace GlpiPlugin\Dashboardng\Pages;

class ChartsPage extends AbstractPage
{
    protected string $pageTitle = 'Charts';
    protected string $menuPage = 'charts';

    /** @var string Chart type from query string */
    private string $chartType;

    /** @var array Valid chart types */
    private array $validTypes = [
        'assets' => 'Assets',
        'category' => 'Category',
        'entities' => 'Entities',
        'overall' => 'Overall',
        'groups' => 'Groups',
        'locations' => 'Locations',
        'requester' => 'Requester',
        'satisfaction' => 'Satisfaction',
        'technician' => 'Technician',
        'times' => 'Time range',
        'by-category' => 'by Category',
        'by-date' => 'by Date',
        'by-entity' => 'by Entity',
        'by-group' => 'by Group',
        'by-location' => 'by Location',
        'by-requester' => 'by Requester',
        'by-technician' => 'by Technician',
        'by-type' => 'by Type',
        'sla-tto' => 'SLA - Time to own',
        'sla-ttr' => 'SLA - Time to resolve',
        'ola-tto' => 'OLA - Time to own',
        'ola-ttr' => 'OLA - Time to resolve',
    ];

    public function __construct()
    {
        $this->chartType = $_GET['type'] ?? 'overall';

        // Validate type
        if (!isset($this->validTypes[$this->chartType])) {
            $this->chartType = 'overall';
        }

        parent::__construct();
    }

    protected function initializeData(): array
    {
        $data = parent::initializeData();
        $data['chart_type'] = $this->chartType;
        $data['chart_type_label'] = $this->validTypes[$this->chartType];
        $data['page_title'] = sprintf(__('Charts - %s', 'dashboardng'), $data['chart_type_label']);
        return $data;
    }

    protected function getTemplate(): string
    {
        return 'pages/charts.twig';
    }

    protected function getTranslations(): array
    {
        return array_merge(parent::getTranslations(), [
            'charts_coming_soon' => __('Charts - Coming Soon', 'dashboardng'),
            'chart_under_development' => __('The %s chart view is under development.', 'dashboardng'),
            'for_now_use_dashboard' => __('For now, please use the main Dashboard page.', 'dashboardng'),
            'go_to_main_dashboard' => __('Go to Main Dashboard', 'dashboardng'),
        ]);
    }
}
