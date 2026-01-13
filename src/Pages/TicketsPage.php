<?php

/**
 * Dashboard NG Plugin - Tickets Page
 *
 * Ticket statistics and reports by various dimensions
 */

namespace GlpiPlugin\Dashboardng\Pages;

use function __;

class TicketsPage extends AbstractPage
{
    protected string $pageTitle = 'Ticket Reports';
    protected string $menuPage = 'tickets';

    protected function getTemplate(): string
    {
        return 'pages/tickets.twig';
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
            'ticket_reports' => __('Ticket Reports', 'dashboardng'),
            'overview' => __('Overview', 'dashboardng'),
            'by_entity' => __('By Entity', 'dashboardng'),
            'by_technician' => __('By Technician', 'dashboardng'),
            'sla_compliance' => __('SLA Compliance', 'dashboardng'),
            'by_category' => __('By Category', 'dashboardng'),
            'by_group' => __('By Group', 'dashboardng'),
            'by_priority' => __('By Priority', 'dashboardng'),
            'period' => __('Period', 'dashboardng'),
            'print' => __('Print', 'dashboardng'),
            'export' => __('Export', 'dashboardng'),

            // Stats
            'total_tickets' => __('Total Tickets', 'dashboardng'),
            'resolved' => __('Resolved', 'dashboardng'),
            'open_tickets' => __('Open', 'dashboardng'),
            'resolution_rate' => __('Resolution Rate', 'dashboardng'),

            // Table columns
            'entity' => __('Entity', 'dashboardng'),
            'technician' => __('Technician', 'dashboardng'),
            'category' => __('Category', 'dashboardng'),
            'group' => __('Group', 'dashboardng'),
            'priority' => __('Priority', 'dashboardng'),
            'total' => __('Total', 'dashboardng'),
            'open' => __('Open', 'dashboardng'),
            'assigned' => __('Assigned', 'dashboardng'),
            'rate' => __('Rate', 'dashboardng'),
            'share' => __('Share', 'dashboardng'),
            'avg_time' => __('Avg Time', 'dashboardng'),
            'count' => __('Count', 'dashboardng'),
            'type' => __('Type', 'dashboardng'),
            'status' => __('Status', 'dashboardng'),
            'by_type' => __('By Type', 'dashboardng'),
            'by_status' => __('By Status', 'dashboardng'),

            // SLA
            'with_sla' => __('With SLA', 'dashboardng'),
            'on_time' => __('On Time', 'dashboardng'),
            'late' => __('Late', 'dashboardng'),
            'overdue' => __('Overdue', 'dashboardng'),
            'compliance_rate' => __('SLA Compliance Rate', 'dashboardng'),
            'monthly_trend' => __('Monthly SLA Trend', 'dashboardng'),
            'month' => __('Month', 'dashboardng'),

            // Reports
            'entity_report' => __('Entity Report', 'dashboardng'),
            'technician_report' => __('Technician Performance', 'dashboardng'),
            'category_report' => __('Category Report', 'dashboardng'),
            'group_report' => __('Group Report', 'dashboardng'),
            'priority_report' => __('Priority Report', 'dashboardng'),

            // Empty states
            'no_entity_data' => __('No entity data available', 'dashboardng'),
            'no_technician_data' => __('No technician data available', 'dashboardng'),
            'no_category_data' => __('No category data available', 'dashboardng'),
            'no_group_data' => __('No group data available', 'dashboardng'),
            'no_priority_data' => __('No priority data available', 'dashboardng'),
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
        ]);
    }
}
