<?php

/**
 * Dashboard NG Plugin - Assets Page
 *
 * Asset statistics and reports
 */

namespace GlpiPlugin\Dashboardng\Pages;

use function __;

class AssetsPage extends AbstractPage
{
    protected string $pageTitle = 'Asset Reports';
    protected string $menuPage = 'assets';

    protected function getTemplate(): string
    {
        return 'pages/assets.twig';
    }

    protected function getTranslations(): array
    {
        return array_merge(parent::getTranslations(), [
            'loading' => __('Loading...', 'dashboardng'),
            'error_loading_report' => __('Error loading report', 'dashboardng'),
            'no_data' => __('No data available', 'dashboardng'),
            'retry' => __('Retry', 'dashboardng'),

            // Page header
            'asset_reports' => __('Asset Reports', 'dashboardng'),
            'print' => __('Print', 'dashboardng'),
            'export' => __('Export', 'dashboardng'),
            'asset_type' => __('Asset Type', 'dashboardng'),
            'showing_reports_for' => __('Showing reports for', 'dashboardng'),

            // Asset types for dropdown
            'computers' => __('Computers', 'dashboardng'),
            'monitors' => __('Monitors', 'dashboardng'),
            'printers' => __('Printers', 'dashboardng'),
            'network_equipment' => __('Network Equipment', 'dashboardng'),
            'phones' => __('Phones', 'dashboardng'),
            'peripherals' => __('Peripherals', 'dashboardng'),
            'software' => __('Software', 'dashboardng'),

            // Stats cards
            'total' => __('Total', 'dashboardng'),
            'in_use' => __('In Use', 'dashboardng'),
            'in_stock' => __('In Stock', 'dashboardng'),
            'with_tickets' => __('With Open Tickets', 'dashboardng'),

            // Report sections
            'by_manufacturer' => __('By Manufacturer', 'dashboardng'),
            'by_status' => __('By Status', 'dashboardng'),
            'by_location' => __('By Location', 'dashboardng'),
            'by_entity' => __('By Entity', 'dashboardng'),
            'by_model' => __('By Model', 'dashboardng'),
            'by_operating_system' => __('By Operating System', 'dashboardng'),
            'by_type' => __('By Type', 'dashboardng'),
            'by_category' => __('By Category', 'dashboardng'),
            'recent_items' => __('Recently Added', 'dashboardng'),

            // Table columns
            'manufacturer' => __('Manufacturer', 'dashboardng'),
            'status' => __('Status', 'dashboardng'),
            'location' => __('Location', 'dashboardng'),
            'entity' => __('Entity', 'dashboardng'),
            'model' => __('Model', 'dashboardng'),
            'operating_system' => __('Operating System', 'dashboardng'),
            'type' => __('Type', 'dashboardng'),
            'category' => __('Category', 'dashboardng'),
            'count' => __('Count', 'dashboardng'),
            'name' => __('Name', 'dashboardng'),
            'serial' => __('Serial', 'dashboardng'),
            'created' => __('Created', 'dashboardng'),
            'unnamed' => __('(unnamed)', 'dashboardng'),

            // Empty states
            'no_manufacturer_data' => __('No manufacturer data', 'dashboardng'),
            'no_status_data' => __('No status data', 'dashboardng'),
            'no_location_data' => __('No location data', 'dashboardng'),
            'no_entity_data' => __('No entity data', 'dashboardng'),
            'no_type_data' => __('No type data', 'dashboardng'),
            'no_recent_items' => __('No recent items', 'dashboardng'),

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
