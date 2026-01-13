<?php

/**
 * Dashboard NG Plugin - Tasks Page
 *
 * Task statistics and reports by various dimensions
 */

namespace GlpiPlugin\Dashboardng\Pages;

use function __;

class TasksPage extends AbstractPage
{
    protected string $pageTitle = 'Task Reports';
    protected string $menuPage = 'tasks';

    protected function getTemplate(): string
    {
        return 'pages/tasks.twig';
    }

    protected function getTranslations(): array
    {
        return array_merge(parent::getTranslations(), [
            'loading' => __('Loading...', 'dashboardng'),
            'error_loading_report' => __('Error loading report', 'dashboardng'),
            'no_data' => __('No data available', 'dashboardng'),
            'retry' => __('Retry', 'dashboardng'),

            // Periods
            'all_time' => __('All time', 'dashboardng'),
            'current_year' => __('Current year', 'dashboardng'),
            'current_month' => __('Current month', 'dashboardng'),
            'last_7_days' => __('Last 7 days', 'dashboardng'),
            'last_15_days' => __('Last 15 days', 'dashboardng'),
            'last_30_days' => __('Last 30 days', 'dashboardng'),
            'last_90_days' => __('Last 90 days', 'dashboardng'),
            'last_180_days' => __('Last 180 days', 'dashboardng'),

            // Report tabs
            'task_reports' => __('Task Reports', 'dashboardng'),
            'overview' => __('Overview', 'dashboardng'),
            'by_technician' => __('By Technician', 'dashboardng'),
            'by_entity' => __('By Entity', 'dashboardng'),
            'by_ticket' => __('By Ticket', 'dashboardng'),
            'period' => __('Period', 'dashboardng'),
            'print' => __('Print', 'dashboardng'),
            'export' => __('Export', 'dashboardng'),

            // Stats
            'total_tasks' => __('Total Tasks', 'dashboardng'),
            'total_time_spent' => __('Total Time Spent', 'dashboardng'),
            'total_hours' => __('Total Hours', 'dashboardng'),
            'time_spent' => __('Time Spent', 'dashboardng'),
            'tasks' => __('Tasks', 'dashboardng'),
            'hours' => __('Hours', 'dashboardng'),

            // Table columns
            'technician' => __('Technician', 'dashboardng'),
            'entity' => __('Entity', 'dashboardng'),
            'ticket_id' => __('ID', 'dashboardng'),
            'ticket_name' => __('Ticket', 'dashboardng'),
            'task_count' => __('Tasks', 'dashboardng'),
            'category' => __('Category', 'dashboardng'),
            'count' => __('Count', 'dashboardng'),

            // Reports
            'tasks_by_technician' => __('Tasks by Technician', 'dashboardng'),
            'tasks_by_entity' => __('Tasks by Entity', 'dashboardng'),
            'tasks_by_category' => __('Tasks by Category', 'dashboardng'),
            'category_breakdown' => __('Category Breakdown', 'dashboardng'),
            'tickets_with_most_tasks' => __('Tickets with Most Tasks', 'dashboardng'),

            // Empty states
            'no_technician_data' => __('No technician data available', 'dashboardng'),
            'no_entity_data' => __('No entity data available', 'dashboardng'),
            'no_category_data' => __('No category data available', 'dashboardng'),
            'no_ticket_data' => __('No ticket data available', 'dashboardng'),
            'select_report' => __('Select a report type', 'dashboardng'),

            // Export
            'csv_desc' => __('Comma-separated values', 'dashboardng'),
            'xlsx_desc' => __('Microsoft Excel format', 'dashboardng'),
            'pdf_desc' => __('Portable Document Format', 'dashboardng'),
            'export_failed' => __('Export failed. Please try again.', 'dashboardng'),

            // Chart Settings
            'chart_settings' => __('Chart Settings', 'dashboardng'),
            'top_k_elements' => __('Top K elements', 'dashboardng'),
            'top_k_desc' => __('Show only the top K elements; group the rest as Others', 'dashboardng'),
            'all' => __('All', 'dashboardng'),
            'items' => __('items', 'dashboardng'),
            'no_specific_settings' => __('No specific settings available for this chart type.', 'dashboardng'),
            'save' => __('Save', 'dashboardng'),
            'cancel' => __('Cancel', 'dashboardng'),
            'settings' => __('Settings', 'dashboardng'),
            'others' => __('Others', 'dashboardng'),
        ]);
    }
}
