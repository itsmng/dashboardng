<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\Queries\ReportQueries;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use TCPDF;

/**
 * Export Report Handler
 * Handles exporting reports to CSV, XLSX, and PDF formats
 */
class ExportReport
{
    private ReportQueries $queries;
    
    /** @var array Report type configurations */
    private array $reportConfigs = [
        'overview' => [
            'title' => 'Overview Report',
            'type' => 'summary', // summary type has special handling
        ],
        'entity' => [
            'title' => 'Entity Report',
            'columns' => [
                'completename' => 'Entity',
                'total_tickets' => 'Total',
                'resolved_tickets' => 'Resolved',
                'open_tickets' => 'Open',
                'resolution_rate' => 'Resolution Rate (%)',
                'avg_resolution_hours' => 'Avg Resolution (h)',
            ],
        ],
        'technician' => [
            'title' => 'Technician Report',
            'columns' => [
                'name' => 'Technician',
                'total_tickets' => 'Assigned',
                'resolved_tickets' => 'Resolved',
                'open_tickets' => 'Open',
                'resolution_rate' => 'Resolution Rate (%)',
                'avg_resolution_hours' => 'Avg Resolution (h)',
            ],
        ],
        'sla' => [
            'title' => 'SLA Compliance Report',
            'type' => 'summary',
        ],
        'category' => [
            'title' => 'Category Report',
            'columns' => [
                'completename' => 'Category',
                'total_tickets' => 'Total',
                'percentage' => 'Share (%)',
                'resolved_tickets' => 'Resolved',
                'resolution_rate' => 'Resolution Rate (%)',
                'avg_resolution_hours' => 'Avg Resolution (h)',
            ],
        ],
        'group' => [
            'title' => 'Group Report',
            'columns' => [
                'completename' => 'Group',
                'total_tickets' => 'Total',
                'resolved_tickets' => 'Resolved',
                'open_tickets' => 'Open',
                'resolution_rate' => 'Resolution Rate (%)',
            ],
        ],
        'priority' => [
            'title' => 'Priority Report',
            'columns' => [
                'label' => 'Priority',
                'total_tickets' => 'Total',
                'resolved_tickets' => 'Resolved',
                'resolution_rate' => 'Resolution Rate (%)',
                'avg_resolution_hours' => 'Avg Resolution (h)',
            ],
        ],
        'source' => [
            'title' => 'Source Report',
            'columns' => [
                'name' => 'Request Source',
                'total_tickets' => 'Total Tickets',
            ],
        ],
        'monthly' => [
            'title' => 'Monthly Trend Report',
            'columns' => [
                'label' => 'Month',
                'total_tickets' => 'Total',
                'resolved_tickets' => 'Resolved',
                'resolution_rate' => 'Resolution Rate (%)',
                'avg_resolution_hours' => 'Avg Resolution (h)',
            ],
        ],
        'task-overview' => [
            'title' => 'Task Overview Report',
            'type' => 'summary',
        ],
        'task-by-technician' => [
            'title' => 'Tasks by Technician Report',
            'columns' => [
                'name' => 'Technician',
                'task_count' => 'Tasks',
                'total_time' => 'Time Spent (seconds)',
                'total_time_hours' => 'Time Spent (hours)',
            ],
        ],
        'task-by-entity' => [
            'title' => 'Tasks by Entity Report',
            'columns' => [
                'name' => 'Entity',
                'task_count' => 'Tasks',
                'total_time' => 'Time Spent (seconds)',
                'total_time_hours' => 'Time Spent (hours)',
            ],
        ],
        'task-by-ticket' => [
            'title' => 'Tasks by Ticket Report',
            'columns' => [
                'id' => 'Ticket ID',
                'name' => 'Ticket Name',
                'task_count' => 'Tasks',
                'total_time' => 'Time Spent (seconds)',
                'total_time_hours' => 'Time Spent (hours)',
            ],
        ],
        'asset-by-itemtype' => [
            'title' => 'Asset Report',
            'type' => 'multi_table',
        ],
    ];

    public function __construct()
    {
        $this->queries = new ReportQueries();
    }

    /**
     * Handle export request
     *
     * @param string $type Report type
     * @param string $format Export format (csv, xlsx, pdf)
     * @param array $params Query parameters
     * @return void Outputs file directly
     */
    public function handle(string $type, string $format, array $params = []): void
    {
        if (!isset($this->reportConfigs[$type])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid report type']);
            return;
        }

        $entities = $this->getEntities($params);
        $period = (int)($params['period'] ?? 0);
        $limit = (int)($params['limit'] ?? 500); // Higher limit for exports
        $itemtype = $params['itemtype'] ?? 'Computer';
        $startDate = $params['start_date'] ?? null;
        $endDate = $params['end_date'] ?? null;

        // Fetch report data
        [$startDate, $endDate] = $this->queries->normalizeCustomPeriod(
            $startDate ? (string) $startDate : null,
            $endDate ? (string) $endDate : null
        );

        $data = match ($type) {
            'overview'   => $this->queries->getOverviewReport($entities, $period, $startDate, $endDate),
            'entity'     => $this->queries->getEntityReport($entities, $period, $startDate, $endDate),
            'technician' => $this->queries->getTechnicianReport($entities, $period, $limit, $startDate, $endDate),
            'sla'        => $this->queries->getSlaReport($entities, $period, $startDate, $endDate),
            'category'   => $this->queries->getCategoryReport($entities, $period, $limit, $startDate, $endDate),
            'group'      => $this->queries->getGroupReport($entities, $period, $limit, $startDate, $endDate),
            'priority'   => $this->queries->getPriorityReport($entities, $period, $startDate, $endDate),
            'source'     => $this->queries->getSourceReport($entities, $period, $startDate, $endDate),
            'monthly'    => $this->queries->getMonthlyReport($entities, $period, $startDate, $endDate),
            'asset-by-itemtype' => $this->queries->getAssetReportByItemtype($itemtype, $entities, $limit, $period, $startDate, $endDate),
            'task-overview'       => $this->queries->getTaskOverviewReport($entities, $period, $startDate, $endDate),
            'task-by-technician'  => $this->queries->getTasksByTechnicianReport($entities, $period, $limit, $startDate, $endDate),
            'task-by-entity'      => $this->queries->getTasksByEntityReport($entities, $period, $limit, $startDate, $endDate),
            'task-by-ticket'      => $this->queries->getTasksByTicketReport($entities, $period, $limit, $startDate, $endDate),
            'asset-overview'       => $this->queries->getAssetOverviewReport($entities, $period, $startDate, $endDate),
            'asset-by-location'    => $this->queries->getAssetsByLocationReport($entities, $limit),
            'asset-by-entity'      => $this->queries->getAssetsByEntityReport($entities, $limit),
            'asset-by-status'      => $this->queries->getAssetsByStatusReport($entities),
            'computer-by-os'       => $this->queries->getComputersByOsReport($entities, $limit, $period, $startDate, $endDate),
            'computer-by-type'     => $this->queries->getComputersByTypeReport($entities, $limit, $period, $startDate, $endDate),
            'computer-by-manufacturer' => $this->queries->getComputersByManufacturerReport($entities, $limit, $period, $startDate, $endDate),
            'monitor-by-manufacturer'   => $this->queries->getMonitorsByManufacturerReport($entities, $limit, $period, $startDate, $endDate),
            'printer-by-manufacturer'   => $this->queries->getPrintersByManufacturerReport($entities, $limit, $period, $startDate, $endDate),
            'network-by-manufacturer'   => $this->queries->getNetworkEquipmentByManufacturerReport($entities, $limit, $period, $startDate, $endDate),
            default      => [],
        };

        $config = $this->reportConfigs[$type];
        $title = $config['title'];
        if ($type === 'asset-by-itemtype' && $itemtype) {
            $title .= " - {$itemtype}";
        }
        $filename = $this->generateFilename($type, $format, $itemtype);
        $periodLabel = $this->getPeriodLabel($period, $startDate, $endDate);

        // Export based on format
        switch ($format) {
            case 'csv':
                $this->exportCsv($type, $data, $config, $filename, $periodLabel);
                break;
            case 'xlsx':
                $this->exportXlsx($type, $data, $config, $filename, $periodLabel, $title);
                break;
            case 'pdf':
                $this->exportPdf($type, $data, $config, $filename, $periodLabel, $title);
                break;
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Invalid export format']);
        }
    }

    /**
     * Generate filename for export
     */
    private function generateFilename(string $type, string $format, string $itemtype = ''): string
    {
        $date = date('Y-m-d_His');
        if ($itemtype) {
            return "report_{$type}_{$itemtype}_{$date}.{$format}";
        }
        return "report_{$type}_{$date}.{$format}";
    }

    /**
     * Get period label for display
     */
    private function getPeriodLabel(int $period, ?string $startDate = null, ?string $endDate = null): string
    {
        if ($startDate || $endDate) {
            $start = $startDate ?: $endDate;
            $end = $endDate ?: $startDate;
            if ($start && $end && $start > $end) {
                [$start, $end] = [$end, $start];
            }
            return sprintf(__('Custom (%s to %s)'), $start ?? __('N/A'), $end ?? __('N/A'));
        }

        return match ($period) {
            0 => __('All time'),
            1 => __('Current year'),
            2 => __('Current month'),
            3 => __('Last 7 days'),
            4 => __('Last 15 days'),
            5 => __('Last 30 days'),
            6 => __('Last 90 days'),
            7 => __('Last 180 days'),
            default => __('Custom'),
        };
    }

    /**
     * Get entities from params or session
     */
    private function getEntities(array $params): array
    {
        if (!empty($params['entities'])) {
            return array_map('intval', explode(',', $params['entities']));
        }

        if (!empty($_SESSION['glpiactiveentities'])) {
            return $_SESSION['glpiactiveentities'];
        }

        if (!empty($_SESSION['glpiactiveprofile']['id'])) {
            $userId = $_SESSION['glpiID'] ?? 0;
            if ($userId > 0) {
                $entities = \Profile_User::getUserEntities($userId, true);
                if (!empty($entities)) {
                    return $entities;
                }
            }
        }

        return [];
    }

    /**
     * Export to CSV format
     */
    private function exportCsv(string $type, array $data, array $config, string $filename, string $periodLabel): void
    {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $output = fopen('php://output', 'w');

        // Add BOM for Excel compatibility
        fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF));

        fputcsv($output, ['Period', $periodLabel]);
        fputcsv($output, []);

        if (($config['type'] ?? '') === 'summary') {
            $this->exportSummaryCsv($output, $type, $data);
        } elseif (($config['type'] ?? '') === 'multi_table') {
            $this->exportMultiTableCsv($output, $type, $data);
        } else {
            $this->exportTableCsv($output, $data, $config['columns']);
        }

        fclose($output);
        exit;
    }

    /**
     * Export summary-type report to CSV
     */
    private function exportSummaryCsv($output, string $type, array $data): void
    {
        if ($type === 'overview') {
            // Summary section
            fputcsv($output, ['Metric', 'Value']);
            fputcsv($output, ['Total Tickets', $data['total_tickets'] ?? 0]);
            fputcsv($output, ['Resolved Tickets', $data['resolved_tickets'] ?? 0]);
            fputcsv($output, ['Open Tickets', $data['open_tickets'] ?? 0]);
            fputcsv($output, ['Resolution Rate (%)', $data['resolution_rate'] ?? 0]);
            fputcsv($output, ['Avg Resolution Time (h)', $data['avg_resolution_time'] ?? 0]);
            fputcsv($output, []);
            
            // By Type
            fputcsv($output, ['By Type']);
            fputcsv($output, ['Type', 'Count']);
            foreach ($data['by_type'] ?? [] as $row) {
                fputcsv($output, [$row['label'], $row['count']]);
            }
            fputcsv($output, []);
            
            // By Status
            fputcsv($output, ['By Status']);
            fputcsv($output, ['Status', 'Count']);
            foreach ($data['by_status'] ?? [] as $row) {
                fputcsv($output, [$row['label'], $row['count']]);
            }
        } elseif ($type === 'sla') {
            // Summary section
            fputcsv($output, ['Metric', 'Value']);
            fputcsv($output, ['Total with SLA', $data['total_with_sla'] ?? 0]);
            fputcsv($output, ['Resolved with SLA', $data['resolved_with_sla'] ?? 0]);
            fputcsv($output, ['On Time', $data['on_time'] ?? 0]);
            fputcsv($output, ['Late', $data['late'] ?? 0]);
            fputcsv($output, ['Overdue', $data['overdue'] ?? 0]);
            fputcsv($output, ['Compliance Rate (%)', $data['compliance_rate'] ?? 0]);
            fputcsv($output, []);
            
            // Monthly trend
            if (!empty($data['monthly_trend'])) {
                fputcsv($output, ['Monthly SLA Trend']);
                fputcsv($output, ['Month', 'Total', 'On Time', 'Late', 'Rate (%)']);
                foreach ($data['monthly_trend'] as $row) {
                    fputcsv($output, [
                        $row['label'],
                        $row['total'],
                        $row['on_time'],
                        $row['late'],
                        $row['rate'],
                    ]);
                }
            }
        }
    }

    /**
     * Export table-type report to CSV
     */
    private function exportTableCsv($output, array $data, array $columns): void
    {
        // Header row
        fputcsv($output, array_values($columns));

        // Data rows
        foreach ($data as $row) {
            $csvRow = [];
            foreach (array_keys($columns) as $key) {
                $csvRow[] = $row[$key] ?? '';
            }
            fputcsv($output, $csvRow);
        }
    }

    /**
     * Export multi-table report to CSV (asset reports)
     */
    private function exportMultiTableCsv($output, string $type, array $data): void
    {
        if ($type === 'asset-by-itemtype') {
            // Summary stats
            fputcsv($output, ['Summary']);
            fputcsv($output, ['Metric', 'Value']);
            fputcsv($output, ['Total Assets', $data['total'] ?? 0]);
            fputcsv($output, ['In Use', $data['in_use'] ?? 0]);
            fputcsv($output, ['In Stock', $data['in_stock'] ?? 0]);
            fputcsv($output, ['With Open Tickets', $data['with_tickets'] ?? 0]);
            fputcsv($output, []);

            // By Manufacturer
            if (!empty($data['by_manufacturer'])) {
                fputcsv($output, ['By Manufacturer']);
                fputcsv($output, ['Manufacturer', 'Count']);
                foreach ($data['by_manufacturer'] as $row) {
                    fputcsv($output, [$row['label'], $row['count']]);
                }
                fputcsv($output, []);
            }

            // By Status
            if (!empty($data['by_status'])) {
                fputcsv($output, ['By Status']);
                fputcsv($output, ['Status', 'Count']);
                foreach ($data['by_status'] as $row) {
                    fputcsv($output, [$row['label'], $row['count']]);
                }
                fputcsv($output, []);
            }

            // By Location
            if (!empty($data['by_location'])) {
                fputcsv($output, ['By Location']);
                fputcsv($output, ['Location', 'Count']);
                foreach ($data['by_location'] as $row) {
                    fputcsv($output, [$row['label'], $row['count']]);
                }
                fputcsv($output, []);
            }

            // By Entity
            if (!empty($data['by_entity'])) {
                fputcsv($output, ['By Entity']);
                fputcsv($output, ['Entity', 'Count']);
                foreach ($data['by_entity'] as $row) {
                    fputcsv($output, [$row['label'], $row['count']]);
                }
                fputcsv($output, []);
            }

            // By Model
            if (!empty($data['by_model'])) {
                fputcsv($output, ['By Model']);
                fputcsv($output, ['Model', 'Count']);
                foreach ($data['by_model'] as $row) {
                    fputcsv($output, [$row['label'], $row['count']]);
                }
                fputcsv($output, []);
            }

            // By OS (Computer only)
            if (!empty($data['by_os'])) {
                fputcsv($output, ['By Operating System']);
                fputcsv($output, ['Operating System', 'Count']);
                foreach ($data['by_os'] as $row) {
                    fputcsv($output, [$row['label'], $row['count']]);
                }
                fputcsv($output, []);
            }

            // By Type (Computer only)
            if (!empty($data['by_type'])) {
                fputcsv($output, ['By Type']);
                fputcsv($output, ['Type', 'Count']);
                foreach ($data['by_type'] as $row) {
                    fputcsv($output, [$row['label'], $row['count']]);
                }
                fputcsv($output, []);
            }

            // By Category (Software only)
            if (!empty($data['by_category'])) {
                fputcsv($output, ['By Category']);
                fputcsv($output, ['Category', 'Count']);
                foreach ($data['by_category'] as $row) {
                    fputcsv($output, [$row['label'], $row['count']]);
                }
                fputcsv($output, []);
            }

            // Recent Items
            if (!empty($data['recent_items'])) {
                fputcsv($output, ['Recent Items']);
                fputcsv($output, ['ID', 'Name', 'Serial', 'Location', 'Status', 'Date Created']);
                foreach ($data['recent_items'] as $row) {
                    fputcsv($output, [
                        $row['id'] ?? '',
                        $row['name'] ?? '',
                        $row['serial'] ?? '',
                        $row['location'] ?? '',
                        $row['status'] ?? '',
                        $row['date_creation'] ?? '',
                    ]);
                }
            }
        }
    }

    /**
     * Export to XLSX format using PhpSpreadsheet
     */
    private function exportXlsx(string $type, array $data, array $config, string $filename, string $periodLabel, string $title = null): void
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $displayTitle = $title ?? $config['title'];
        $sheet->setTitle(substr($displayTitle, 0, 31)); // Excel sheet name limit

        // Styling
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN],
            ],
        ];

        $titleStyle = [
            'font' => ['bold' => true, 'size' => 14],
        ];

        $row = 1;

        // Title
        $sheet->setCellValue('A' . $row, $displayTitle);
        $sheet->getStyle('A' . $row)->applyFromArray($titleStyle);
        $row++;

        // Period info
        $sheet->setCellValue('A' . $row, 'Period: ' . $periodLabel);
        $row++;

        // Generated date
        $sheet->setCellValue('A' . $row, 'Generated: ' . date('Y-m-d H:i:s'));
        $row += 2;

        if (($config['type'] ?? '') === 'summary') {
            $this->exportSummaryXlsx($sheet, $type, $data, $row, $headerStyle);
        } elseif (($config['type'] ?? '') === 'multi_table') {
            $this->exportMultiTableXlsx($sheet, $type, $data, $row, $headerStyle);
        } else {
            $this->exportTableXlsx($sheet, $data, $config['columns'], $row, $headerStyle);
        }

        // Auto-size columns
        foreach (range('A', $sheet->getHighestColumn()) as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Output
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new Xlsx($spreadsheet);
        $writer->save('php://output');
        exit;
    }

    /**
     * Export summary-type report to XLSX
     */
    private function exportSummaryXlsx($sheet, string $type, array $data, int &$row, array $headerStyle): void
    {
        if ($type === 'overview') {
            // Summary metrics
            $sheet->setCellValue('A' . $row, 'Metric');
            $sheet->setCellValue('B' . $row, 'Value');
            $sheet->getStyle("A{$row}:B{$row}")->applyFromArray($headerStyle);
            $row++;

            $metrics = [
                ['Total Tickets', $data['total_tickets'] ?? 0],
                ['Resolved Tickets', $data['resolved_tickets'] ?? 0],
                ['Open Tickets', $data['open_tickets'] ?? 0],
                ['Resolution Rate (%)', $data['resolution_rate'] ?? 0],
                ['Avg Resolution Time (h)', $data['avg_resolution_time'] ?? 0],
            ];

            foreach ($metrics as $metric) {
                $sheet->setCellValue('A' . $row, $metric[0]);
                $sheet->setCellValue('B' . $row, $metric[1]);
                $row++;
            }
            $row++;

            // By Type section
            if (!empty($data['by_type'])) {
                $sheet->setCellValue('A' . $row, 'By Type');
                $sheet->getStyle('A' . $row)->getFont()->setBold(true);
                $row++;
                $sheet->setCellValue('A' . $row, 'Type');
                $sheet->setCellValue('B' . $row, 'Count');
                $sheet->getStyle("A{$row}:B{$row}")->applyFromArray($headerStyle);
                $row++;
                foreach ($data['by_type'] as $item) {
                    $sheet->setCellValue('A' . $row, $item['label']);
                    $sheet->setCellValue('B' . $row, $item['count']);
                    $row++;
                }
                $row++;
            }

            // By Status section
            if (!empty($data['by_status'])) {
                $sheet->setCellValue('A' . $row, 'By Status');
                $sheet->getStyle('A' . $row)->getFont()->setBold(true);
                $row++;
                $sheet->setCellValue('A' . $row, 'Status');
                $sheet->setCellValue('B' . $row, 'Count');
                $sheet->getStyle("A{$row}:B{$row}")->applyFromArray($headerStyle);
                $row++;
                foreach ($data['by_status'] as $item) {
                    $sheet->setCellValue('A' . $row, $item['label']);
                    $sheet->setCellValue('B' . $row, $item['count']);
                    $row++;
                }
            }
        } elseif ($type === 'sla') {
            // Summary metrics
            $sheet->setCellValue('A' . $row, 'Metric');
            $sheet->setCellValue('B' . $row, 'Value');
            $sheet->getStyle("A{$row}:B{$row}")->applyFromArray($headerStyle);
            $row++;

            $metrics = [
                ['Total with SLA', $data['total_with_sla'] ?? 0],
                ['Resolved with SLA', $data['resolved_with_sla'] ?? 0],
                ['On Time', $data['on_time'] ?? 0],
                ['Late', $data['late'] ?? 0],
                ['Overdue', $data['overdue'] ?? 0],
                ['Compliance Rate (%)', $data['compliance_rate'] ?? 0],
            ];

            foreach ($metrics as $metric) {
                $sheet->setCellValue('A' . $row, $metric[0]);
                $sheet->setCellValue('B' . $row, $metric[1]);
                $row++;
            }
            $row++;

            // Monthly trend
            if (!empty($data['monthly_trend'])) {
                $sheet->setCellValue('A' . $row, 'Monthly SLA Trend');
                $sheet->getStyle('A' . $row)->getFont()->setBold(true);
                $row++;
                
                $cols = ['Month', 'Total', 'On Time', 'Late', 'Rate (%)'];
                $col = 'A';
                foreach ($cols as $header) {
                    $sheet->setCellValue($col . $row, $header);
                    $col++;
                }
                $sheet->getStyle("A{$row}:E{$row}")->applyFromArray($headerStyle);
                $row++;

                foreach ($data['monthly_trend'] as $item) {
                    $sheet->setCellValue('A' . $row, $item['label']);
                    $sheet->setCellValue('B' . $row, $item['total']);
                    $sheet->setCellValue('C' . $row, $item['on_time']);
                    $sheet->setCellValue('D' . $row, $item['late']);
                    $sheet->setCellValue('E' . $row, $item['rate']);
                    $row++;
                }
            }
        }
    }

    /**
     * Export table-type report to XLSX
     */
    private function exportTableXlsx($sheet, array $data, array $columns, int &$row, array $headerStyle): void
    {
        // Headers
        $col = 'A';
        foreach ($columns as $label) {
            $sheet->setCellValue($col . $row, $label);
            $col++;
        }
        $lastCol = chr(ord('A') + count($columns) - 1);
        $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray($headerStyle);
        $row++;

        // Data
        foreach ($data as $dataRow) {
            $col = 'A';
            foreach (array_keys($columns) as $key) {
                $sheet->setCellValue($col . $row, $dataRow[$key] ?? '');
                $col++;
            }
            $row++;
        }

        // Add borders to data area
        $dataRange = "A5:{$lastCol}" . ($row - 1);
        $sheet->getStyle($dataRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
    }

    /**
     * Export multi-table report to XLSX (asset reports)
     */
    private function exportMultiTableXlsx($sheet, string $type, array $data, int &$row, array $headerStyle): void
    {
        if ($type === 'asset-by-itemtype') {
            // Summary section
            $sheet->setCellValue('A' . $row, 'Summary');
            $sheet->getStyle('A' . $row)->getFont()->setBold(true);
            $row++;
            $sheet->setCellValue('A' . $row, 'Metric');
            $sheet->setCellValue('B' . $row, 'Value');
            $sheet->getStyle("A{$row}:B{$row}")->applyFromArray($headerStyle);
            $row++;

            $metrics = [
                ['Total Assets', $data['total'] ?? 0],
                ['In Use', $data['in_use'] ?? 0],
                ['In Stock', $data['in_stock'] ?? 0],
                ['With Open Tickets', $data['with_tickets'] ?? 0],
            ];

            foreach ($metrics as $metric) {
                $sheet->setCellValue('A' . $row, $metric[0]);
                $sheet->setCellValue('B' . $row, $metric[1]);
                $row++;
            }
            $row += 2;

            // Helper to add a table section
            $addTable = function($title, $dataRows, $colLabel, $colCount) use (&$sheet, &$row, $headerStyle) {
                if (empty($dataRows)) {
                    return;
                }
                $sheet->setCellValue('A' . $row, $title);
                $sheet->getStyle('A' . $row)->getFont()->setBold(true);
                $row++;
                $sheet->setCellValue('A' . $row, $colLabel);
                $sheet->setCellValue('B' . $row, 'Count');
                $sheet->getStyle("A{$row}:B{$row}")->applyFromArray($headerStyle);
                $row++;
                foreach ($dataRows as $item) {
                    $sheet->setCellValue('A' . $row, $item['label']);
                    $sheet->setCellValue('B' . $row, $item['count']);
                    $row++;
                }
                $row += 2;
            };

            // Add all tables
            $addTable('By Manufacturer', $data['by_manufacturer'] ?? [], 'Manufacturer', 0);
            $addTable('By Status', $data['by_status'] ?? [], 'Status', 0);
            $addTable('By Location', $data['by_location'] ?? [], 'Location', 0);
            $addTable('By Entity', $data['by_entity'] ?? [], 'Entity', 0);
            $addTable('By Model', $data['by_model'] ?? [], 'Model', 0);

            if (!empty($data['by_os'])) {
                $addTable('By Operating System', $data['by_os'], 'Operating System', 0);
            }
            if (!empty($data['by_type'])) {
                $addTable('By Type', $data['by_type'], 'Type', 0);
            }
            if (!empty($data['by_category'])) {
                $addTable('By Category', $data['by_category'], 'Category', 0);
            }

            // Recent Items
            if (!empty($data['recent_items'])) {
                $sheet->setCellValue('A' . $row, 'Recent Items');
                $sheet->getStyle('A' . $row)->getFont()->setBold(true);
                $row++;

                $cols = ['ID', 'Name', 'Serial', 'Location', 'Status', 'Date Created'];
                $col = 'A';
                foreach ($cols as $colLabel) {
                    $sheet->setCellValue($col . $row, $colLabel);
                    $col++;
                }
                $lastCol = chr(ord('A') + count($cols) - 1);
                $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray($headerStyle);
                $row++;

                foreach ($data['recent_items'] as $item) {
                    $sheet->setCellValue('A' . $row, $item['id'] ?? '');
                    $sheet->setCellValue('B' . $row, $item['name'] ?? '');
                    $sheet->setCellValue('C' . $row, $item['serial'] ?? '');
                    $sheet->setCellValue('D' . $row, $item['location'] ?? '');
                    $sheet->setCellValue('E' . $row, $item['status'] ?? '');
                    $sheet->setCellValue('F' . $row, $item['date_creation'] ?? '');
                    $row++;
                }
            }
        }
    }

    /**
     * Export to PDF format using TCPDF
     */
    private function exportPdf(string $type, array $data, array $config, string $filename, string $periodLabel, string $title = null): void
    {
        // Check if TCPDF is available
        if (!class_exists('TCPDF')) {
            // Try to load from GLPI vendor
            $tcpdfPath = GLPI_ROOT . '/vendor/tecnickcom/tcpdf/tcpdf.php';
            if (file_exists($tcpdfPath)) {
                require_once $tcpdfPath;
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'PDF library not available']);
                return;
            }
        }

        $pdf = new TCPDF('L', 'mm', 'A4', true, 'UTF-8', false);

        $displayTitle = $title ?? $config['title'];

        // Set document information
        $pdf->SetCreator('DashboardNG');
        $pdf->SetAuthor($_SESSION['glpirealname'] ?? 'ITSM-NG');
        $pdf->SetTitle($displayTitle);

        // Remove default header/footer
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(true);

        // Set margins
        $pdf->SetMargins(10, 10, 10);

        // Add page
        $pdf->AddPage();

        // Title
        $pdf->SetFont('helvetica', 'B', 16);
        $pdf->Cell(0, 10, $displayTitle, 0, 1, 'C');
        
        // Period and date
        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 6, 'Period: ' . $periodLabel, 0, 1, 'C');
        $pdf->Cell(0, 6, 'Generated: ' . date('Y-m-d H:i:s'), 0, 1, 'C');
        $pdf->Ln(5);

        if (($config['type'] ?? '') === 'summary') {
            $this->exportSummaryPdf($pdf, $type, $data);
        } elseif (($config['type'] ?? '') === 'multi_table') {
            $this->exportMultiTablePdf($pdf, $type, $data);
        } else {
            $this->exportTablePdf($pdf, $data, $config['columns']);
        }

        // Output
        $pdf->Output($filename, 'D');
        exit;
    }

    /**
     * Export summary-type report to PDF
     */
    private function exportSummaryPdf(TCPDF $pdf, string $type, array $data): void
    {
        if ($type === 'overview') {
            // Summary table
            $pdf->SetFont('helvetica', 'B', 12);
            $pdf->Cell(0, 8, 'Summary', 0, 1, 'L');
            
            $pdf->SetFont('helvetica', '', 10);
            $html = '<table border="1" cellpadding="4">
                <tr style="background-color: #4472C4; color: white; font-weight: bold;">
                    <th width="50%">Metric</th>
                    <th width="50%">Value</th>
                </tr>
                <tr><td>Total Tickets</td><td>' . ($data['total_tickets'] ?? 0) . '</td></tr>
                <tr><td>Resolved Tickets</td><td>' . ($data['resolved_tickets'] ?? 0) . '</td></tr>
                <tr><td>Open Tickets</td><td>' . ($data['open_tickets'] ?? 0) . '</td></tr>
                <tr><td>Resolution Rate (%)</td><td>' . ($data['resolution_rate'] ?? 0) . '</td></tr>
                <tr><td>Avg Resolution Time (h)</td><td>' . ($data['avg_resolution_time'] ?? 0) . '</td></tr>
            </table>';
            $pdf->writeHTML($html, true, false, true, false, '');
            $pdf->Ln(5);

            // By Type
            if (!empty($data['by_type'])) {
                $pdf->SetFont('helvetica', 'B', 12);
                $pdf->Cell(0, 8, 'By Type', 0, 1, 'L');
                
                $html = '<table border="1" cellpadding="4">
                    <tr style="background-color: #4472C4; color: white; font-weight: bold;">
                        <th width="50%">Type</th>
                        <th width="50%">Count</th>
                    </tr>';
                foreach ($data['by_type'] as $row) {
                    $html .= '<tr><td>' . htmlspecialchars($row['label']) . '</td><td>' . $row['count'] . '</td></tr>';
                }
                $html .= '</table>';
                $pdf->writeHTML($html, true, false, true, false, '');
                $pdf->Ln(5);
            }

            // By Status
            if (!empty($data['by_status'])) {
                $pdf->SetFont('helvetica', 'B', 12);
                $pdf->Cell(0, 8, 'By Status', 0, 1, 'L');
                
                $html = '<table border="1" cellpadding="4">
                    <tr style="background-color: #4472C4; color: white; font-weight: bold;">
                        <th width="50%">Status</th>
                        <th width="50%">Count</th>
                    </tr>';
                foreach ($data['by_status'] as $row) {
                    $html .= '<tr><td>' . htmlspecialchars($row['label']) . '</td><td>' . $row['count'] . '</td></tr>';
                }
                $html .= '</table>';
                $pdf->writeHTML($html, true, false, true, false, '');
            }
        } elseif ($type === 'sla') {
            // Summary table
            $pdf->SetFont('helvetica', 'B', 12);
            $pdf->Cell(0, 8, 'SLA Summary', 0, 1, 'L');
            
            $html = '<table border="1" cellpadding="4">
                <tr style="background-color: #4472C4; color: white; font-weight: bold;">
                    <th width="50%">Metric</th>
                    <th width="50%">Value</th>
                </tr>
                <tr><td>Total with SLA</td><td>' . ($data['total_with_sla'] ?? 0) . '</td></tr>
                <tr><td>Resolved with SLA</td><td>' . ($data['resolved_with_sla'] ?? 0) . '</td></tr>
                <tr><td>On Time</td><td>' . ($data['on_time'] ?? 0) . '</td></tr>
                <tr><td>Late</td><td>' . ($data['late'] ?? 0) . '</td></tr>
                <tr><td>Overdue</td><td>' . ($data['overdue'] ?? 0) . '</td></tr>
                <tr><td>Compliance Rate (%)</td><td>' . ($data['compliance_rate'] ?? 0) . '</td></tr>
            </table>';
            $pdf->writeHTML($html, true, false, true, false, '');
            $pdf->Ln(5);

            // Monthly trend
            if (!empty($data['monthly_trend'])) {
                $pdf->SetFont('helvetica', 'B', 12);
                $pdf->Cell(0, 8, 'Monthly SLA Trend', 0, 1, 'L');
                
                $html = '<table border="1" cellpadding="4">
                    <tr style="background-color: #4472C4; color: white; font-weight: bold;">
                        <th width="25%">Month</th>
                        <th width="18%">Total</th>
                        <th width="19%">On Time</th>
                        <th width="19%">Late</th>
                        <th width="19%">Rate (%)</th>
                    </tr>';
                foreach ($data['monthly_trend'] as $row) {
                    $html .= '<tr>
                        <td>' . htmlspecialchars($row['label']) . '</td>
                        <td>' . $row['total'] . '</td>
                        <td>' . $row['on_time'] . '</td>
                        <td>' . $row['late'] . '</td>
                        <td>' . $row['rate'] . '</td>
                    </tr>';
                }
                $html .= '</table>';
                $pdf->writeHTML($html, true, false, true, false, '');
            }
        }
    }

    /**
     * Export table-type report to PDF
     */
    private function exportTablePdf(TCPDF $pdf, array $data, array $columns): void
    {
        $colCount = count($columns);
        $colWidth = floor(277 / $colCount); // A4 landscape width minus margins

        // Build HTML table
        $html = '<table border="1" cellpadding="4">';
        
        // Header
        $html .= '<tr style="background-color: #4472C4; color: white; font-weight: bold;">';
        foreach ($columns as $label) {
            $html .= '<th width="' . $colWidth . '">' . htmlspecialchars($label) . '</th>';
        }
        $html .= '</tr>';

        // Data rows
        $rowNum = 0;
        foreach ($data as $row) {
            $bgColor = ($rowNum % 2 === 0) ? '#FFFFFF' : '#F2F2F2';
            $html .= '<tr style="background-color: ' . $bgColor . ';">';
            foreach (array_keys($columns) as $key) {
                $value = $row[$key] ?? '';
                $html .= '<td>' . htmlspecialchars((string)$value) . '</td>';
            }
            $html .= '</tr>';
            $rowNum++;
        }

        $html .= '</table>';

        $pdf->SetFont('helvetica', '', 9);
        $pdf->writeHTML($html, true, false, true, false, '');
    }

    /**
     * Export multi-table report to PDF (asset reports with charts)
     */
    private function exportMultiTablePdf(TCPDF $pdf, string $type, array $data): void
    {
        if ($type === 'asset-by-itemtype') {
            // Summary section
            $pdf->SetFont('helvetica', 'B', 12);
            $pdf->Cell(0, 8, 'Summary', 0, 1, 'L');

            $pdf->SetFont('helvetica', '', 10);
            $html = '<table border="1" cellpadding="4">
                <tr style="background-color: #4472C4; color: white; font-weight: bold;">
                    <th width="50%">Metric</th>
                    <th width="50%">Value</th>
                </tr>
                <tr><td>Total Assets</td><td>' . ($data['total'] ?? 0) . '</td></tr>
                <tr><td>In Use</td><td>' . ($data['in_use'] ?? 0) . '</td></tr>
                <tr><td>In Stock</td><td>' . ($data['in_stock'] ?? 0) . '</td></tr>
                <tr><td>With Open Tickets</td><td>' . ($data['with_tickets'] ?? 0) . '</td></tr>
            </table>';
            $pdf->writeHTML($html, true, false, true, false, '');
            $pdf->Ln(5);

            // Helper to add table section with chart
            $addTableWithChart = function($title, $dataRows, $colLabel) use (&$pdf) {
                if (empty($dataRows)) {
                    return;
                }
                $pdf->SetFont('helvetica', 'B', 12);
                $pdf->Cell(0, 8, $title, 0, 1, 'L');

                $pdf->SetFont('helvetica', '', 10);
                $html = '<table border="1" cellpadding="4">
                    <tr style="background-color: #4472C4; color: white; font-weight: bold;">
                        <th width="50%">' . $colLabel . '</th>
                        <th width="50%">Count</th>
                    </tr>';
                foreach ($dataRows as $row) {
                    $html .= '<tr><td>' . htmlspecialchars($row['label']) . '</td><td>' . $row['count'] . '</td></tr>';
                }
                $html .= '</table>';
                $pdf->writeHTML($html, true, false, true, false, '');
                $pdf->Ln(5);
            };

            // Add all tables
            $addTableWithChart('By Manufacturer', $data['by_manufacturer'] ?? [], 'Manufacturer');
            $addTableWithChart('By Status', $data['by_status'] ?? [], 'Status');
            $addTableWithChart('By Location', $data['by_location'] ?? [], 'Location');
            $addTableWithChart('By Entity', $data['by_entity'] ?? [], 'Entity');
            $addTableWithChart('By Model', $data['by_model'] ?? [], 'Model');

            if (!empty($data['by_os'])) {
                $addTableWithChart('By Operating System', $data['by_os'], 'Operating System');
            }
            if (!empty($data['by_type'])) {
                $addTableWithChart('By Type', $data['by_type'], 'Type');
            }
            if (!empty($data['by_category'])) {
                $addTableWithChart('By Category', $data['by_category'], 'Category');
            }

            // Recent Items
            if (!empty($data['recent_items'])) {
                $pdf->SetFont('helvetica', 'B', 12);
                $pdf->Cell(0, 8, 'Recent Items', 0, 1, 'L');

                $pdf->SetFont('helvetica', '', 9);
                $html = '<table border="1" cellpadding="4">
                    <tr style="background-color: #4472C4; color: white; font-weight: bold;">
                        <th width="10%">ID</th>
                        <th width="25%">Name</th>
                        <th width="15%">Serial</th>
                        <th width="20%">Location</th>
                        <th width="15%">Status</th>
                        <th width="15%">Date Created</th>
                    </tr>';
                foreach ($data['recent_items'] as $item) {
                    $html .= '<tr>
                        <td>' . htmlspecialchars($item['id'] ?? '') . '</td>
                        <td>' . htmlspecialchars($item['name'] ?? '') . '</td>
                        <td>' . htmlspecialchars($item['serial'] ?? '') . '</td>
                        <td>' . htmlspecialchars($item['location'] ?? '') . '</td>
                        <td>' . htmlspecialchars($item['status'] ?? '') . '</td>
                        <td>' . htmlspecialchars($item['date_creation'] ?? '') . '</td>
                    </tr>';
                }
                $html .= '</table>';
                $pdf->writeHTML($html, true, false, true, false, '');
            }
        }
    }
}
