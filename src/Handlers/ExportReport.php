<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\Queries\ReportQueries;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Chart\Chart;
use PhpOffice\PhpSpreadsheet\Chart\Legend;
use PhpOffice\PhpSpreadsheet\Chart\PlotArea;
use PhpOffice\PhpSpreadsheet\Chart\Title;
use PhpOffice\PhpSpreadsheet\Chart\DataSeries;
use PhpOffice\PhpSpreadsheet\Chart\DataSeriesValues;
use TCPDF;

/**
 * Export Report Handler
 * Handles exporting reports to CSV, XLSX, and PDF formats
 */
class ExportReport
{
    private ReportQueries $queries;

    /** @var array Report type configurations */
    private array $reportConfigs = [];

    private const CHART_TOPK_DEFAULT = 8;
    private const CHART_DATA_START_COL_INDEX = 27; // Column AA
    private const CHART_WIDTH_COLUMNS = 8;
    private const CHART_HEIGHT_ROWS = 15;
    private const CHART_ROW_GAP = 2;
    private const ASSET_TOP_LIMIT = 10;
    private const ASSET_MODEL_LIMIT = 15;
    private const TASK_TOP_LIMIT = 10;

    public function __construct()
    {
        $this->queries = new ReportQueries();
        $this->reportConfigs = $this->buildReportConfigs();
    }

    /**
     * Build report configurations with translations
     */
    private function buildReportConfigs(): array
    {
        return [
            'overview' => [
                'title' => __('Overview Report', 'dashboardng'),
                'type' => 'summary',
            ],
            'entity' => [
                'title' => __('Entity Report', 'dashboardng'),
                'columns' => [
                    'completename' => __('Entity', 'dashboardng'),
                    'total_tickets' => __('Total', 'dashboardng'),
                    'share_display' => __('Share', 'dashboardng'),
                    'resolved_tickets' => __('Resolved', 'dashboardng'),
                    'open_tickets' => __('Open', 'dashboardng'),
                    'resolution_rate_display' => __('Rate', 'dashboardng'),
                    'avg_resolution_display' => __('Avg Time', 'dashboardng'),
                ],
            ],
            'technician' => [
                'title' => __('Technician Report', 'dashboardng'),
                'columns' => [
                    'name' => __('Technician', 'dashboardng'),
                    'total_tickets' => __('Assigned', 'dashboardng'),
                    'share_display' => __('Share', 'dashboardng'),
                    'resolved_tickets' => __('Resolved', 'dashboardng'),
                    'open_tickets' => __('Open', 'dashboardng'),
                    'resolution_rate_display' => __('Rate', 'dashboardng'),
                    'avg_resolution_display' => __('Avg Time', 'dashboardng'),
                ],
            ],
            'sla' => [
                'title' => __('SLA Compliance Report', 'dashboardng'),
                'type' => 'summary',
            ],
            'category' => [
                'title' => __('Category Report', 'dashboardng'),
                'columns' => [
                    'completename' => __('Category', 'dashboardng'),
                    'total_tickets' => __('Total', 'dashboardng'),
                    'share_display' => __('Share', 'dashboardng'),
                    'resolved_tickets' => __('Resolved', 'dashboardng'),
                    'resolution_rate_display' => __('Rate', 'dashboardng'),
                    'avg_resolution_display' => __('Avg Time', 'dashboardng'),
                ],
            ],
            'group' => [
                'title' => __('Group Report', 'dashboardng'),
                'columns' => [
                    'completename' => __('Group', 'dashboardng'),
                    'total_tickets' => __('Total', 'dashboardng'),
                    'share_display' => __('Share', 'dashboardng'),
                    'resolved_tickets' => __('Resolved', 'dashboardng'),
                    'open_tickets' => __('Open', 'dashboardng'),
                    'resolution_rate_display' => __('Rate', 'dashboardng'),
                ],
            ],
            'priority' => [
                'title' => __('Priority Report', 'dashboardng'),
                'columns' => [
                    'label' => __('Priority', 'dashboardng'),
                    'total_tickets' => __('Total', 'dashboardng'),
                    'share_display' => __('Share', 'dashboardng'),
                    'resolved_tickets' => __('Resolved', 'dashboardng'),
                    'resolution_rate_display' => __('Rate', 'dashboardng'),
                    'avg_resolution_display' => __('Avg Time', 'dashboardng'),
                ],
            ],
            'source' => [
                'title' => __('Source Report', 'dashboardng'),
                'columns' => [
                    'name' => __('Source', 'dashboardng'),
                    'total_tickets' => __('Total', 'dashboardng'),
                    'share_display' => __('Share', 'dashboardng'),
                ],
            ],
            'monthly' => [
                'title' => __('Monthly Trend Report', 'dashboardng'),
                'columns' => [
                    'label' => __('Month', 'dashboardng'),
                    'total_tickets' => __('Total', 'dashboardng'),
                    'resolved_tickets' => __('Resolved', 'dashboardng'),
                    'resolution_rate_display' => __('Rate', 'dashboardng'),
                    'avg_resolution_display' => __('Avg Time', 'dashboardng'),
                ],
            ],
            'task-overview' => [
                'title' => __('Task Overview Report', 'dashboardng'),
                'type' => 'summary',
            ],
            'task-by-technician' => [
                'title' => __('Tasks by Technician Report', 'dashboardng'),
                'columns' => [
                    'name' => __('Technician', 'dashboardng'),
                    'task_count' => __('Tasks', 'dashboardng'),
                    'total_time_display' => __('Time Spent', 'dashboardng'),
                    'total_time_hours_display' => __('Hours', 'dashboardng'),
                ],
            ],
            'task-by-entity' => [
                'title' => __('Tasks by Entity Report', 'dashboardng'),
                'columns' => [
                    'name' => __('Entity', 'dashboardng'),
                    'task_count' => __('Tasks', 'dashboardng'),
                    'total_time_display' => __('Time Spent', 'dashboardng'),
                    'total_time_hours_display' => __('Hours', 'dashboardng'),
                ],
            ],
            'task-by-ticket' => [
                'title' => __('Tasks by Ticket Report', 'dashboardng'),
                'columns' => [
                    'id' => __('ID', 'dashboardng'),
                    'name' => __('Ticket', 'dashboardng'),
                    'task_count' => __('Tasks', 'dashboardng'),
                    'total_time_display' => __('Time Spent', 'dashboardng'),
                ],
            ],
            'asset-by-itemtype' => [
                'title' => __('Asset Report', 'dashboardng'),
                'type' => 'multi_table',
            ],
        ];
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
        $context = $this->buildQueryContext($params);
        $data = $this->getReportData($type, $context);

        $config = $this->reportConfigs[$type];
        $title = $this->getReportTitle($type, $context['itemtype']);
        $filename = $this->generateFilename($type, $format, $context['itemtype']);
        $periodLabel = $this->getPeriodLabel($context['period'], $context['startDate'], $context['endDate']);

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
     * Handle bulk export request
     */
    public function handleBulk(string $format, array $params = []): void
    {
        $typesParam = $params['types'] ?? '';
        $types = is_array($typesParam) ? $typesParam : explode(',', (string) $typesParam);
        $types = array_values(array_filter(array_map('trim', $types)));
        $types = array_values(array_unique($types));

        if (empty($types)) {
            http_response_code(400);
            echo json_encode(['error' => 'No report types selected']);
            return;
        }

        $invalidTypes = array_diff($types, array_keys($this->reportConfigs));
        if (!empty($invalidTypes)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid report types']);
            return;
        }

        $context = $this->buildQueryContext($params);
        $periodLabel = $this->getPeriodLabel($context['period'], $context['startDate'], $context['endDate']);
        $dateStamp = date('Y-m-d_His');

        switch ($format) {
            case 'csv':
                $this->exportBulkCsv($types, $context, $periodLabel, $dateStamp);
                break;
            case 'xlsx':
                $this->exportBulkXlsx($types, $context, $periodLabel, $dateStamp);
                break;
            case 'pdf':
                $this->exportBulkPdf($types, $context, $periodLabel, $dateStamp);
                break;
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Invalid export format']);
        }
    }

    /**
     * Build query context from params
     */
    private function buildQueryContext(array $params): array
    {
        $entities = $this->getEntities($params);
        $period = (int)($params['period'] ?? 0);
        $limit = (int)($params['limit'] ?? 50);
        $itemtype = $params['itemtype'] ?? 'Computer';
        $startDate = $params['start_date'] ?? null;
        $endDate = $params['end_date'] ?? null;

        [$startDate, $endDate] = $this->queries->normalizeCustomPeriod(
            $startDate ? (string) $startDate : null,
            $endDate ? (string) $endDate : null
        );

        return [
            'entities' => $entities,
            'period' => $period,
            'limit' => $limit,
            'itemtype' => $itemtype,
            'startDate' => $startDate,
            'endDate' => $endDate,
        ];
    }

    /**
     * Fetch report data based on type
     */
    private function getReportData(string $type, array $context): array
    {
        $entities = $context['entities'];
        $period = $context['period'];
        $limit = $context['limit'];
        $itemtype = $context['itemtype'];
        $startDate = $context['startDate'];
        $endDate = $context['endDate'];

        return match ($type) {
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
            default      => [],
        };
    }

    /**
     * Resolve report title
     */
    private function getReportTitle(string $type, string $itemtype = ''): string
    {
        $title = $this->reportConfigs[$type]['title'] ?? $type;
        if ($type === 'asset-by-itemtype' && $itemtype) {
            $title .= " - {$itemtype}";
        }
        return $title;
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
            return sprintf(__('Custom (%s to %s)', 'dashboardng'), $start ?? __('N/A', 'dashboardng'), $end ?? __('N/A', 'dashboardng'));
        }

        return match ($period) {
            0 => __('All time', 'dashboardng'),
            1 => __('Current year', 'dashboardng'),
            2 => __('Current month', 'dashboardng'),
            3 => __('Last 7 days', 'dashboardng'),
            4 => __('Last 15 days', 'dashboardng'),
            5 => __('Last 30 days', 'dashboardng'),
            6 => __('Last 90 days', 'dashboardng'),
            7 => __('Last 180 days', 'dashboardng'),
            default => __('Custom', 'dashboardng'),
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
     * Format a numeric value for display
     */
    private function formatNumber(float $value, int $precision = 1): string
    {
        $rounded = round($value, $precision);
        if ($precision <= 0) {
            return (string)(int)$rounded;
        }
        $formatted = number_format($rounded, $precision, '.', '');
        return rtrim(rtrim($formatted, '0'), '.');
    }

    /**
     * Format a percent value
     */
    private function formatPercent(float $value): string
    {
        return $this->formatNumber($value, 1) . '%';
    }

    /**
     * Format hours value
     */
    private function formatHours(float $value): string
    {
        return $this->formatNumber($value, 1) . 'h';
    }

    /**
     * Format a duration in seconds (e.g. 1h 30m)
     */
    private function formatDuration(int $seconds): string
    {
        if ($seconds <= 0) {
            return '0h';
        }

        $hours = intdiv($seconds, 3600);
        $minutes = intdiv($seconds % 3600, 60);

        if ($hours > 0 && $minutes > 0) {
            return $hours . 'h ' . $minutes . 'm';
        }

        if ($hours > 0) {
            return $hours . 'h';
        }

        return $minutes . 'm';
    }

    /**
     * Prepare table rows with computed display fields
     */
    private function prepareTableRows(string $type, array $rows): array
    {
        $prepared = [];
        $shareTypes = ['entity', 'technician', 'category', 'group', 'priority', 'source'];
        $shareTotal = 0;

        if (in_array($type, $shareTypes, true)) {
            foreach ($rows as $row) {
                $shareTotal += (int)($row['total_tickets'] ?? 0);
            }
        }

        foreach ($rows as $row) {
            $item = $row;

            if (in_array($type, $shareTypes, true)) {
                $value = (int)($row['total_tickets'] ?? 0);
                $share = $shareTotal > 0 ? round(($value / $shareTotal) * 100, 1) : 0;
                $item['share_display'] = $this->formatPercent($share);
            }

            if (in_array($type, ['entity', 'technician', 'category', 'group', 'priority', 'monthly'], true)) {
                $item['resolution_rate_display'] = $this->formatPercent((float)($row['resolution_rate'] ?? 0));
            }

            if (in_array($type, ['entity', 'technician', 'category', 'priority', 'monthly'], true)) {
                $item['avg_resolution_display'] = $this->formatHours((float)($row['avg_resolution_hours'] ?? 0));
            }

            if (in_array($type, ['task-by-technician', 'task-by-entity', 'task-by-ticket', 'task-overview'], true)) {
                $item['total_time_display'] = $this->formatDuration((int)($row['total_time'] ?? 0));
            }

            if (in_array($type, ['task-by-technician', 'task-by-entity'], true)) {
                $item['total_time_hours_display'] = $this->formatHours((float)($row['total_time_hours'] ?? 0));
            }

            $prepared[] = $item;
        }

        return $prepared;
    }

    private function escapeSheetTitle(string $title): string
    {
        $escaped = str_replace("'", "''", $title);
        return "'" . $escaped . "'";
    }

    private function buildTopKRows(array $rows, string $valueKey, string $labelKey, int $limit, array $extraKeys = []): array
    {
        if ($limit <= 0 || count($rows) <= $limit) {
            return $rows;
        }

        usort($rows, function (array $a, array $b) use ($valueKey): int {
            $aValue = (float)($a[$valueKey] ?? 0);
            $bValue = (float)($b[$valueKey] ?? 0);
            return $bValue <=> $aValue;
        });

        $topRows = array_slice($rows, 0, $limit);
        $rest = array_slice($rows, $limit);

        $restValue = 0.0;
        foreach ($rest as $row) {
            $restValue += (float)($row[$valueKey] ?? 0);
        }

        if ($restValue <= 0) {
            return $topRows;
        }

        $summary = [$labelKey => __('Others', 'dashboardng')];
        foreach (array_merge([$valueKey], $extraKeys) as $key) {
            $sum = 0.0;
            foreach ($rest as $row) {
                $sum += (float)($row[$key] ?? 0);
            }
            $summary[$key] = $sum;
        }

        $topRows[] = $summary;
        return $topRows;
    }

    private function extractLabels(array $rows, array $keys): array
    {
        $labels = [];
        foreach ($rows as $row) {
            $label = '';
            foreach ($keys as $key) {
                if (!empty($row[$key])) {
                    $label = (string) $row[$key];
                    break;
                }
            }
            if ($label === '') {
                $label = __('Unknown', 'dashboardng');
            }
            $labels[] = $label;
        }
        return $labels;
    }

    private function extractNumericValues(array $rows, string $key): array
    {
        $values = [];
        foreach ($rows as $row) {
            $values[] = (float)($row[$key] ?? 0);
        }
        return $values;
    }

    private function buildChartCellRef(Worksheet $sheet, int $colIndex, int $row): string
    {
        $column = Coordinate::stringFromColumnIndex($colIndex);
        return $this->escapeSheetTitle($sheet->getTitle()) . '!$' . $column . '$' . $row;
    }

    private function buildChartRange(Worksheet $sheet, int $colIndex, int $rowStart, int $rowEnd): string
    {
        $column = Coordinate::stringFromColumnIndex($colIndex);
        $sheetTitle = $this->escapeSheetTitle($sheet->getTitle());
        return $sheetTitle . '!$' . $column . '$' . $rowStart . ':$' . $column . '$' . $rowEnd;
    }

    private function writeChartDataBlock(
        Worksheet $sheet,
        int &$row,
        int $startColIndex,
        string $labelHeader,
        array $labels,
        array $series
    ): ?array {
        if (empty($labels) || empty($series)) {
            return null;
        }

        $startRow = $row;
        $sheet->setCellValue($this->cellAddress($startColIndex, $row), $labelHeader);
        foreach ($series as $index => $serie) {
            $sheet->setCellValue(
                $this->cellAddress($startColIndex + $index + 1, $row),
                $serie['name'] ?? ''
            );
        }
        $row++;

        $rowCount = count($labels);
        for ($i = 0; $i < $rowCount; $i++) {
            $sheet->setCellValue($this->cellAddress($startColIndex, $row + $i), $labels[$i]);
            foreach ($series as $index => $serie) {
                $value = $serie['values'][$i] ?? 0;
                $sheet->setCellValue($this->cellAddress($startColIndex + $index + 1, $row + $i), $value);
            }
        }

        $endRow = $row + $rowCount - 1;
        $seriesRanges = [];
        foreach ($series as $index => $serie) {
            $seriesRanges[] = [
                'nameRange' => $this->buildChartCellRef($sheet, $startColIndex + $index + 1, $startRow),
                'valuesRange' => $this->buildChartRange($sheet, $startColIndex + $index + 1, $row, $endRow),
            ];
        }

        $block = [
            'rowCount' => $rowCount,
            'labelRange' => $this->buildChartRange($sheet, $startColIndex, $row, $endRow),
            'seriesRanges' => $seriesRanges,
            'endColumnIndex' => $startColIndex + count($series),
        ];

        $row = $endRow + 2;
        return $block;
    }

    private function cellAddress(int $colIndex, int $row): string
    {
        return Coordinate::stringFromColumnIndex($colIndex) . $row;
    }

    private function addChartFromSeries(
        Worksheet $sheet,
        string $chartTitle,
        string $chartType,
        string $labelHeader,
        array $labels,
        array $series,
        int &$chartRow,
        int &$chartDataRow,
        int $chartDataStartColIndex,
        int &$chartDataMaxColIndex,
        ?string $grouping = null,
        ?string $direction = null,
        bool $showLegend = true
    ): void {
        $block = $this->writeChartDataBlock($sheet, $chartDataRow, $chartDataStartColIndex, $labelHeader, $labels, $series);
        if ($block === null) {
            return;
        }

        $chartDataMaxColIndex = max($chartDataMaxColIndex, $block['endColumnIndex']);

        $dataSeriesLabels = [];
        $dataSeriesValues = [];
        foreach ($block['seriesRanges'] as $seriesRange) {
            $dataSeriesLabels[] = new DataSeriesValues('String', $seriesRange['nameRange'], null, 1);
            $dataSeriesValues[] = new DataSeriesValues('Number', $seriesRange['valuesRange'], null, $block['rowCount']);
        }

        $xAxisTickValues = [
            new DataSeriesValues('String', $block['labelRange'], null, $block['rowCount']),
        ];

        $grouping = $grouping ?? DataSeries::GROUPING_STANDARD;
        $series = new DataSeries(
            $chartType,
            $grouping,
            range(0, count($dataSeriesValues) - 1),
            $dataSeriesLabels,
            $xAxisTickValues,
            $dataSeriesValues
        );

        if ($direction) {
            $series->setPlotDirection($direction);
        }

        $plotArea = new PlotArea(null, [$series]);
        $legend = $showLegend ? new Legend(Legend::POSITION_RIGHT, null, false) : null;

        $chartId = 'chart_' . md5($chartTitle . '_' . $chartRow . '_' . microtime(true));
        $chart = new Chart(
            $chartId,
            new Title($chartTitle),
            $legend,
            $plotArea,
            true,
            0,
            null,
            null
        );

        $topLeft = $this->cellAddress(1, $chartRow);
        $bottomRight = $this->cellAddress(self::CHART_WIDTH_COLUMNS, $chartRow + self::CHART_HEIGHT_ROWS);
        $chart->setTopLeftPosition($topLeft);
        $chart->setBottomRightPosition($bottomRight);

        $sheet->addChart($chart);
        $chartRow += self::CHART_HEIGHT_ROWS + self::CHART_ROW_GAP;
    }

    private function addXlsxCharts(Worksheet $sheet, string $type, array $data, int $startRow): void
    {
        $chartDataRow = 1;
        $chartDataStartColIndex = self::CHART_DATA_START_COL_INDEX;
        $chartDataMaxColIndex = $chartDataStartColIndex;
        $chartRow = max(5, $startRow);
        $chartsAdded = false;

        $addChart = function (
            string $chartTitle,
            string $chartType,
            string $labelHeader,
            array $labels,
            array $series,
            ?string $grouping = null,
            ?string $direction = null,
            bool $showLegend = true
        ) use (
            $sheet,
            &$chartRow,
            &$chartDataRow,
            $chartDataStartColIndex,
            &$chartDataMaxColIndex,
            &$chartsAdded
        ): void {
            if (empty($labels)) {
                return;
            }
            $this->addChartFromSeries(
                $sheet,
                $chartTitle,
                $chartType,
                $labelHeader,
                $labels,
                $series,
                $chartRow,
                $chartDataRow,
                $chartDataStartColIndex,
                $chartDataMaxColIndex,
                $grouping,
                $direction,
                $showLegend
            );
            $chartsAdded = true;
        };

        switch ($type) {
            case 'overview': {
                $byType = $this->buildTopKRows($data['by_type'] ?? [], 'count', 'label', self::CHART_TOPK_DEFAULT);
                $addChart(
                    __('By Type', 'dashboardng'),
                    DataSeries::TYPE_PIECHART,
                    __('Type', 'dashboardng'),
                    $this->extractLabels($byType, ['label']),
                    [[
                        'name' => __('Count', 'dashboardng'),
                        'values' => $this->extractNumericValues($byType, 'count'),
                    ]]
                );

                $byStatus = $this->buildTopKRows($data['by_status'] ?? [], 'count', 'label', self::CHART_TOPK_DEFAULT);
                $addChart(
                    __('By Status', 'dashboardng'),
                    DataSeries::TYPE_PIECHART,
                    __('Status', 'dashboardng'),
                    $this->extractLabels($byStatus, ['label']),
                    [[
                        'name' => __('Count', 'dashboardng'),
                        'values' => $this->extractNumericValues($byStatus, 'count'),
                    ]]
                );
                break;
            }
            case 'entity': {
                $topRows = $this->buildTopKRows(
                    $data,
                    'total_tickets',
                    'completename',
                    self::CHART_TOPK_DEFAULT,
                    ['resolved_tickets', 'open_tickets']
                );
                $labels = $this->extractLabels($topRows, ['completename', 'name']);

                $addChart(
                    __('Ticket Volume by Entity', 'dashboardng'),
                    DataSeries::TYPE_BARCHART,
                    __('Entity', 'dashboardng'),
                    $labels,
                    [[
                        'name' => __('Total', 'dashboardng'),
                        'values' => $this->extractNumericValues($topRows, 'total_tickets'),
                    ]],
                    DataSeries::GROUPING_CLUSTERED
                );

                $addChart(
                    __('Entity Resolution Mix', 'dashboardng'),
                    DataSeries::TYPE_BARCHART,
                    __('Entity', 'dashboardng'),
                    $labels,
                    [
                        [
                            'name' => __('Resolved', 'dashboardng'),
                            'values' => $this->extractNumericValues($topRows, 'resolved_tickets'),
                        ],
                        [
                            'name' => __('Open', 'dashboardng'),
                            'values' => $this->extractNumericValues($topRows, 'open_tickets'),
                        ],
                    ],
                    DataSeries::GROUPING_STACKED
                );
                break;
            }
            case 'technician': {
                $topRows = $this->buildTopKRows(
                    $data,
                    'total_tickets',
                    'name',
                    self::CHART_TOPK_DEFAULT,
                    ['resolved_tickets', 'open_tickets']
                );
                $labels = $this->extractLabels($topRows, ['name']);

                $addChart(
                    __('Tickets by Technician', 'dashboardng'),
                    DataSeries::TYPE_BARCHART,
                    __('Technician', 'dashboardng'),
                    $labels,
                    [[
                        'name' => __('Assigned', 'dashboardng'),
                        'values' => $this->extractNumericValues($topRows, 'total_tickets'),
                    ]],
                    DataSeries::GROUPING_CLUSTERED
                );

                $addChart(
                    __('Resolution Mix', 'dashboardng'),
                    DataSeries::TYPE_BARCHART,
                    __('Technician', 'dashboardng'),
                    $labels,
                    [
                        [
                            'name' => __('Resolved', 'dashboardng'),
                            'values' => $this->extractNumericValues($topRows, 'resolved_tickets'),
                        ],
                        [
                            'name' => __('Open', 'dashboardng'),
                            'values' => $this->extractNumericValues($topRows, 'open_tickets'),
                        ],
                    ],
                    DataSeries::GROUPING_STACKED
                );
                break;
            }
            case 'category': {
                $topRows = $this->buildTopKRows(
                    $data,
                    'total_tickets',
                    'completename',
                    self::CHART_TOPK_DEFAULT,
                    ['resolved_tickets', 'avg_resolution_hours']
                );
                $labels = $this->extractLabels($topRows, ['completename', 'name']);

                $addChart(
                    __('Category Share', 'dashboardng'),
                    DataSeries::TYPE_PIECHART,
                    __('Category', 'dashboardng'),
                    $labels,
                    [[
                        'name' => __('Tickets', 'dashboardng'),
                        'values' => $this->extractNumericValues($topRows, 'total_tickets'),
                    ]]
                );

                $addChart(
                    __('Avg Resolution Time', 'dashboardng'),
                    DataSeries::TYPE_BARCHART,
                    __('Category', 'dashboardng'),
                    $labels,
                    [[
                        'name' => __('Avg Resolution (h)', 'dashboardng'),
                        'values' => $this->extractNumericValues($topRows, 'avg_resolution_hours'),
                    ]],
                    DataSeries::GROUPING_CLUSTERED
                );
                break;
            }
            case 'group': {
                $topRows = $this->buildTopKRows(
                    $data,
                    'total_tickets',
                    'completename',
                    self::CHART_TOPK_DEFAULT,
                    ['resolved_tickets', 'open_tickets']
                );
                $labels = $this->extractLabels($topRows, ['completename', 'name']);

                $addChart(
                    __('Ticket Volume by Group', 'dashboardng'),
                    DataSeries::TYPE_BARCHART,
                    __('Group', 'dashboardng'),
                    $labels,
                    [[
                        'name' => __('Total', 'dashboardng'),
                        'values' => $this->extractNumericValues($topRows, 'total_tickets'),
                    ]],
                    DataSeries::GROUPING_CLUSTERED
                );

                $addChart(
                    __('Resolution Mix', 'dashboardng'),
                    DataSeries::TYPE_BARCHART,
                    __('Group', 'dashboardng'),
                    $labels,
                    [
                        [
                            'name' => __('Resolved', 'dashboardng'),
                            'values' => $this->extractNumericValues($topRows, 'resolved_tickets'),
                        ],
                        [
                            'name' => __('Open', 'dashboardng'),
                            'values' => $this->extractNumericValues($topRows, 'open_tickets'),
                        ],
                    ],
                    DataSeries::GROUPING_STACKED
                );
                break;
            }
            case 'priority': {
                $topRows = $this->buildTopKRows(
                    $data,
                    'total_tickets',
                    'label',
                    self::CHART_TOPK_DEFAULT,
                    ['resolved_tickets']
                );
                $labels = $this->extractLabels($topRows, ['label']);

                $addChart(
                    __('Tickets by Priority', 'dashboardng'),
                    DataSeries::TYPE_BARCHART,
                    __('Priority', 'dashboardng'),
                    $labels,
                    [[
                        'name' => __('Total', 'dashboardng'),
                        'values' => $this->extractNumericValues($topRows, 'total_tickets'),
                    ]],
                    DataSeries::GROUPING_CLUSTERED
                );

                $addChart(
                    __('Resolution Rate by Priority', 'dashboardng'),
                    DataSeries::TYPE_BARCHART,
                    __('Priority', 'dashboardng'),
                    $labels,
                    [[
                        'name' => __('Resolution Rate', 'dashboardng'),
                        'values' => $this->extractNumericValues($topRows, 'resolution_rate'),
                    ]],
                    DataSeries::GROUPING_CLUSTERED
                );
                break;
            }
            case 'source': {
                $topRows = $this->buildTopKRows($data, 'total_tickets', 'name', self::CHART_TOPK_DEFAULT);
                $labels = $this->extractLabels($topRows, ['name']);

                $addChart(
                    __('Ticket Sources', 'dashboardng'),
                    DataSeries::TYPE_PIECHART,
                    __('Source', 'dashboardng'),
                    $labels,
                    [[
                        'name' => __('Tickets', 'dashboardng'),
                        'values' => $this->extractNumericValues($topRows, 'total_tickets'),
                    ]]
                );

                $addChart(
                    __('Source Volume', 'dashboardng'),
                    DataSeries::TYPE_BARCHART,
                    __('Source', 'dashboardng'),
                    $labels,
                    [[
                        'name' => __('Tickets', 'dashboardng'),
                        'values' => $this->extractNumericValues($topRows, 'total_tickets'),
                    ]],
                    DataSeries::GROUPING_CLUSTERED
                );
                break;
            }
            case 'monthly': {
                $labels = $this->extractLabels($data, ['label', 'month']);

                $addChart(
                    __('Monthly Ticket Volume', 'dashboardng'),
                    DataSeries::TYPE_LINECHART,
                    __('Month', 'dashboardng'),
                    $labels,
                    [
                        [
                            'name' => __('Total', 'dashboardng'),
                            'values' => $this->extractNumericValues($data, 'total_tickets'),
                        ],
                        [
                            'name' => __('Resolved', 'dashboardng'),
                            'values' => $this->extractNumericValues($data, 'resolved_tickets'),
                        ],
                    ],
                    DataSeries::GROUPING_STANDARD
                );

                $addChart(
                    __('Resolution Rate Trend', 'dashboardng'),
                    DataSeries::TYPE_BARCHART,
                    __('Month', 'dashboardng'),
                    $labels,
                    [[
                        'name' => __('Resolution Rate', 'dashboardng'),
                        'values' => $this->extractNumericValues($data, 'resolution_rate'),
                    ]],
                    DataSeries::GROUPING_CLUSTERED
                );
                break;
            }
            case 'task-overview': {
                $byCategory = $this->buildTopKRows($data['by_category'] ?? [], 'count', 'label', self::CHART_TOPK_DEFAULT, ['total_time']);
                $addChart(
                    __('Tasks by Category', 'dashboardng'),
                    DataSeries::TYPE_PIECHART,
                    __('Category', 'dashboardng'),
                    $this->extractLabels($byCategory, ['label']),
                    [[
                        'name' => __('Tasks', 'dashboardng'),
                        'values' => $this->extractNumericValues($byCategory, 'count'),
                    ]]
                );
                break;
            }
            case 'task-by-technician': {
                $rows = array_slice($data, 0, self::TASK_TOP_LIMIT);
                $labels = $this->extractLabels($rows, ['name']);
                $addChart(
                    __('Tasks by Technician', 'dashboardng'),
                    DataSeries::TYPE_BARCHART,
                    __('Technician', 'dashboardng'),
                    $labels,
                    [[
                        'name' => __('Tasks', 'dashboardng'),
                        'values' => $this->extractNumericValues($rows, 'task_count'),
                    ]],
                    DataSeries::GROUPING_CLUSTERED,
                    DataSeries::DIRECTION_BAR
                );
                break;
            }
            case 'task-by-entity': {
                $labels = $this->extractLabels($data, ['name', 'completename']);
                $addChart(
                    __('Tasks by Entity', 'dashboardng'),
                    DataSeries::TYPE_PIECHART,
                    __('Entity', 'dashboardng'),
                    $labels,
                    [[
                        'name' => __('Tasks', 'dashboardng'),
                        'values' => $this->extractNumericValues($data, 'task_count'),
                    ]]
                );
                break;
            }
            case 'asset-by-itemtype': {
                if (!empty($data['error'])) {
                    break;
                }

                $byManufacturer = $this->buildTopKRows($data['by_manufacturer'] ?? [], 'count', 'label', self::CHART_TOPK_DEFAULT);
                $addChart(
                    __('By Manufacturer', 'dashboardng'),
                    DataSeries::TYPE_PIECHART,
                    __('Manufacturer', 'dashboardng'),
                    $this->extractLabels($byManufacturer, ['label']),
                    [[
                        'name' => __('Count', 'dashboardng'),
                        'values' => $this->extractNumericValues($byManufacturer, 'count'),
                    ]]
                );

                $byStatus = $this->buildTopKRows($data['by_status'] ?? [], 'count', 'label', self::CHART_TOPK_DEFAULT);
                $addChart(
                    __('By Status', 'dashboardng'),
                    DataSeries::TYPE_PIECHART,
                    __('Status', 'dashboardng'),
                    $this->extractLabels($byStatus, ['label']),
                    [[
                        'name' => __('Count', 'dashboardng'),
                        'values' => $this->extractNumericValues($byStatus, 'count'),
                    ]]
                );

                if (!empty($data['by_location'])) {
                    $rows = array_slice($data['by_location'], 0, self::ASSET_TOP_LIMIT);
                    $addChart(
                        __('By Location', 'dashboardng'),
                        DataSeries::TYPE_BARCHART,
                        __('Location', 'dashboardng'),
                        $this->extractLabels($rows, ['label']),
                        [[
                            'name' => __('Count', 'dashboardng'),
                            'values' => $this->extractNumericValues($rows, 'count'),
                        ]],
                        DataSeries::GROUPING_CLUSTERED,
                        DataSeries::DIRECTION_BAR
                    );
                }

                if (!empty($data['by_entity'])) {
                    $rows = array_slice($data['by_entity'], 0, self::ASSET_TOP_LIMIT);
                    $addChart(
                        __('By Entity', 'dashboardng'),
                        DataSeries::TYPE_BARCHART,
                        __('Entity', 'dashboardng'),
                        $this->extractLabels($rows, ['label']),
                        [[
                            'name' => __('Count', 'dashboardng'),
                            'values' => $this->extractNumericValues($rows, 'count'),
                        ]],
                        DataSeries::GROUPING_CLUSTERED,
                        DataSeries::DIRECTION_BAR
                    );
                }

                if (!empty($data['by_os'])) {
                    $byOs = $this->buildTopKRows($data['by_os'], 'count', 'label', self::CHART_TOPK_DEFAULT);
                    $addChart(
                        __('By Operating System', 'dashboardng'),
                        DataSeries::TYPE_PIECHART,
                        __('Operating System', 'dashboardng'),
                        $this->extractLabels($byOs, ['label']),
                        [[
                            'name' => __('Count', 'dashboardng'),
                            'values' => $this->extractNumericValues($byOs, 'count'),
                        ]]
                    );
                }

                if (!empty($data['by_type'])) {
                    $byType = $this->buildTopKRows($data['by_type'], 'count', 'label', self::CHART_TOPK_DEFAULT);
                    $addChart(
                        __('By Type', 'dashboardng'),
                        DataSeries::TYPE_PIECHART,
                        __('Type', 'dashboardng'),
                        $this->extractLabels($byType, ['label']),
                        [[
                            'name' => __('Count', 'dashboardng'),
                            'values' => $this->extractNumericValues($byType, 'count'),
                        ]]
                    );
                }

                if (!empty($data['by_category'])) {
                    $byCategory = $this->buildTopKRows($data['by_category'], 'count', 'label', self::CHART_TOPK_DEFAULT);
                    $addChart(
                        __('By Category', 'dashboardng'),
                        DataSeries::TYPE_PIECHART,
                        __('Category', 'dashboardng'),
                        $this->extractLabels($byCategory, ['label']),
                        [[
                            'name' => __('Count', 'dashboardng'),
                            'values' => $this->extractNumericValues($byCategory, 'count'),
                        ]]
                    );
                }

                if (!empty($data['by_model'])) {
                    $rows = array_slice($data['by_model'], 0, self::ASSET_MODEL_LIMIT);
                    $addChart(
                        __('By Model', 'dashboardng'),
                        DataSeries::TYPE_BARCHART,
                        __('Model', 'dashboardng'),
                        $this->extractLabels($rows, ['label']),
                        [[
                            'name' => __('Count', 'dashboardng'),
                            'values' => $this->extractNumericValues($rows, 'count'),
                        ]],
                        DataSeries::GROUPING_CLUSTERED,
                        DataSeries::DIRECTION_BAR
                    );
                }
                break;
            }
            default:
                break;
        }

        if ($chartsAdded) {
            for ($colIndex = $chartDataStartColIndex; $colIndex <= $chartDataMaxColIndex; $colIndex++) {
                $column = Coordinate::stringFromColumnIndex($colIndex);
                $sheet->getColumnDimension($column)->setVisible(false);
            }
        }
    }

    /**
     * Export to CSV format
     */
    private function exportCsv(string $type, array $data, array $config, string $filename, string $periodLabel): void
    {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $content = $this->buildCsvContent($type, $data, $config, $periodLabel);
        echo $content;
        exit;
    }

    /**
     * Build CSV content for export
     */
    private function buildCsvContent(string $type, array $data, array $config, string $periodLabel): string
    {
        $output = fopen('php://temp', 'r+');

        // Add BOM for Excel compatibility
        fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF));

        fputcsv($output, [__('Period', 'dashboardng'), $periodLabel]);
        fputcsv($output, []);

        if (($config['type'] ?? '') === 'summary') {
            $this->exportSummaryCsv($output, $type, $data);
        } elseif (($config['type'] ?? '') === 'multi_table') {
            $this->exportMultiTableCsv($output, $type, $data);
        } else {
            $this->exportTableCsv($output, $type, $data, $config['columns']);
        }

        rewind($output);
        $content = stream_get_contents($output);
        fclose($output);

        return $content;
    }

    /**
     * Export summary-type report to CSV
     */
    private function exportSummaryCsv($output, string $type, array $data): void
    {
        $writeTable = function (string $title, string $tableType, array $columns, array $rows) use ($output): void {
            if (empty($rows)) {
                return;
            }
            fputcsv($output, [$title]);
            $this->exportTableCsv($output, $tableType, $rows, $columns);
            fputcsv($output, []);
        };

        if ($type === 'overview') {
            $writeTable(__('By Type', 'dashboardng'), 'overview', [
                'label' => __('Type', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_type'] ?? []);

            $writeTable(__('By Status', 'dashboardng'), 'overview', [
                'label' => __('Status', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_status'] ?? []);
            return;
        }

        if ($type === 'sla') {
            $trendRows = [];
            foreach ($data['monthly_trend'] ?? [] as $row) {
                $trendRows[] = [
                    'label' => $row['label'] ?? '',
                    'total' => $row['total'] ?? 0,
                    'on_time' => $row['on_time'] ?? 0,
                    'late' => $row['late'] ?? 0,
                    'rate_display' => $this->formatPercent((float)($row['rate'] ?? 0)),
                ];
            }

            $writeTable(__('Monthly SLA Trend', 'dashboardng'), 'sla', [
                'label' => __('Month', 'dashboardng'),
                'total' => __('Total', 'dashboardng'),
                'on_time' => __('On Time', 'dashboardng'),
                'late' => __('Late', 'dashboardng'),
                'rate_display' => __('Rate', 'dashboardng'),
            ], $trendRows);
            return;
        }

        if ($type === 'task-overview') {
            $columns = [
                'label' => __('Category', 'dashboardng'),
                'count' => __('Tasks', 'dashboardng'),
                'total_time_display' => __('Time Spent', 'dashboardng'),
            ];

            $rows = $data['by_category'] ?? [];
            $writeTable(__('Tasks by Category', 'dashboardng'), 'task-overview', $columns, $rows);
            $writeTable(__('Category Breakdown', 'dashboardng'), 'task-overview', $columns, $rows);
        }
    }

    /**
     * Export table-type report to CSV
     */
    private function exportTableCsv($output, string $type, array $data, array $columns): void
    {
        $prepared = $this->prepareTableRows($type, $data);
        // Header row
        fputcsv($output, array_values($columns));

        // Data rows
        foreach ($prepared as $row) {
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
            $writeTable = function (string $title, array $columns, array $rows) use ($output): void {
                if (empty($rows)) {
                    return;
                }
                fputcsv($output, [$title]);
                $this->exportTableCsv($output, 'asset-by-itemtype', $rows, $columns);
                fputcsv($output, []);
            };

            $writeTable(__('By Manufacturer', 'dashboardng'), [
                'label' => __('Manufacturer', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_manufacturer'] ?? []);

            $writeTable(__('By Status', 'dashboardng'), [
                'label' => __('Status', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_status'] ?? []);

            if (!empty($data['by_os'])) {
                $writeTable(__('By Operating System', 'dashboardng'), [
                    'label' => __('Operating System', 'dashboardng'),
                    'count' => __('Count', 'dashboardng'),
                ], $data['by_os']);
            }

            if (!empty($data['by_type'])) {
                $writeTable(__('By Type', 'dashboardng'), [
                    'label' => __('Type', 'dashboardng'),
                    'count' => __('Count', 'dashboardng'),
                ], $data['by_type']);
            }

            if (!empty($data['by_category'])) {
                $writeTable(__('By Category', 'dashboardng'), [
                    'label' => __('Category', 'dashboardng'),
                    'count' => __('Count', 'dashboardng'),
                ], $data['by_category']);
            }

            $writeTable(__('By Model', 'dashboardng'), [
                'label' => __('Model', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_model'] ?? []);

            if (!empty($data['recent_items'])) {
                $recentRows = [];
                foreach ($data['recent_items'] as $recentItem) {
                    $recentRows[] = [
                        'name' => $recentItem['name'] ?? '',
                        'serial' => $recentItem['serial'] ?? '',
                        'location' => $recentItem['location'] ?? '',
                        'status' => $recentItem['status'] ?? '',
                        'date_creation' => $recentItem['date_creation'] ?? '',
                    ];
                }

                $writeTable(__('Recently Added', 'dashboardng'), [
                    'name' => __('Name', 'dashboardng'),
                    'serial' => __('Serial', 'dashboardng'),
                    'location' => __('Location', 'dashboardng'),
                    'status' => __('Status', 'dashboardng'),
                    'date_creation' => __('Created', 'dashboardng'),
                ], $recentRows);
            }
        }
    }

    /**
     * Export to XLSX format using PhpSpreadsheet
     */
    private function exportXlsx(string $type, array $data, array $config, string $filename, string $periodLabel, string $title = null): void
    {
        $spreadsheet = new Spreadsheet();
        $usedTitles = [];
        $displayTitle = $title ?? $config['title'];
        $this->addXlsxSheet($spreadsheet, $type, $data, $config, $periodLabel, $displayTitle, true, $usedTitles);

        // Output
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new Xlsx($spreadsheet);
        $writer->setIncludeCharts(true);
        $writer->save('php://output');
        exit;
    }

    /**
     * Add a report sheet to a spreadsheet
     */
    private function addXlsxSheet(Spreadsheet $spreadsheet, string $type, array $data, array $config, string $periodLabel, string $title, bool $useActiveSheet, array &$usedTitles): void
    {
        $sheet = $useActiveSheet ? $spreadsheet->getActiveSheet() : $spreadsheet->createSheet();
        $sheetTitle = $this->normalizeSheetTitle($title, $usedTitles);
        $sheet->setTitle($sheetTitle);

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

        $sheet->setCellValue('A' . $row, $title);
        $sheet->getStyle('A' . $row)->applyFromArray($titleStyle);
        $row++;

        $sheet->setCellValue('A' . $row, __('Period', 'dashboardng') . ': ' . $periodLabel);
        $row++;

        $sheet->setCellValue('A' . $row, __('Generated', 'dashboardng') . ': ' . date('Y-m-d H:i:s'));
        $row += 2;

        if (($config['type'] ?? '') === 'summary') {
            $this->exportSummaryXlsx($sheet, $type, $data, $row, $headerStyle);
        } elseif (($config['type'] ?? '') === 'multi_table') {
            $this->exportMultiTableXlsx($sheet, $type, $data, $row, $headerStyle);
        } else {
            $this->exportTableXlsx($sheet, $type, $data, $config['columns'], $row, $headerStyle);
        }

        $this->addXlsxCharts($sheet, $type, $data, $row + 1);

        $highestColumn = $sheet->getHighestColumn();
        $highestColumnIndex = Coordinate::columnIndexFromString($highestColumn);
        for ($colIndex = 1; $colIndex <= $highestColumnIndex; $colIndex++) {
            $col = Coordinate::stringFromColumnIndex($colIndex);
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    /**
     * Normalize and de-duplicate sheet titles
     */
    private function normalizeSheetTitle(string $title, array &$usedTitles): string
    {
        $base = preg_replace('/[\[\]\*\?\\/]/', '', $title);
        $base = trim($base);
        if ($base === '') {
            $base = 'Sheet';
        }
        $base = substr($base, 0, 31);
        $candidate = $base;
        $suffix = 2;

        while (in_array($candidate, $usedTitles, true)) {
            $suffixLabel = ' ' . $suffix;
            $candidate = substr($base, 0, 31 - strlen($suffixLabel)) . $suffixLabel;
            $suffix++;
        }

        $usedTitles[] = $candidate;
        return $candidate;
    }

    /**
     * Export summary-type report to XLSX
     */
    private function exportSummaryXlsx($sheet, string $type, array $data, int &$row, array $headerStyle): void
    {
        $addTable = function (string $title, string $tableType, array $columns, array $rows) use (&$sheet, &$row, $headerStyle): void {
            if (empty($rows)) {
                return;
            }
            $sheet->setCellValue('A' . $row, $title);
            $sheet->getStyle('A' . $row)->getFont()->setBold(true);
            $row++;

            $prepared = $this->prepareTableRows($tableType, $rows);

            $col = 'A';
            foreach ($columns as $label) {
                $sheet->setCellValue($col . $row, $label);
                $col++;
            }
            $lastCol = chr(ord('A') + count($columns) - 1);
            $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray($headerStyle);
            $row++;

            foreach ($prepared as $item) {
                $col = 'A';
                foreach (array_keys($columns) as $key) {
                    $sheet->setCellValue($col . $row, $item[$key] ?? '');
                    $col++;
                }
                $row++;
            }
            $row++;
        };

        if ($type === 'overview') {
            $addTable(__('By Type', 'dashboardng'), 'overview', [
                'label' => __('Type', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_type'] ?? []);

            $addTable(__('By Status', 'dashboardng'), 'overview', [
                'label' => __('Status', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_status'] ?? []);
            return;
        }

        if ($type === 'sla') {
            $trendRows = [];
            foreach ($data['monthly_trend'] ?? [] as $item) {
                $trendRows[] = [
                    'label' => $item['label'] ?? '',
                    'total' => $item['total'] ?? 0,
                    'on_time' => $item['on_time'] ?? 0,
                    'late' => $item['late'] ?? 0,
                    'rate_display' => $this->formatPercent((float)($item['rate'] ?? 0)),
                ];
            }

            $addTable(__('Monthly SLA Trend', 'dashboardng'), 'sla', [
                'label' => __('Month', 'dashboardng'),
                'total' => __('Total', 'dashboardng'),
                'on_time' => __('On Time', 'dashboardng'),
                'late' => __('Late', 'dashboardng'),
                'rate_display' => __('Rate', 'dashboardng'),
            ], $trendRows);
            return;
        }

        if ($type === 'task-overview') {
            $columns = [
                'label' => __('Category', 'dashboardng'),
                'count' => __('Tasks', 'dashboardng'),
                'total_time_display' => __('Time Spent', 'dashboardng'),
            ];
            $rows = $data['by_category'] ?? [];
            $addTable(__('Tasks by Category', 'dashboardng'), 'task-overview', $columns, $rows);
            $addTable(__('Category Breakdown', 'dashboardng'), 'task-overview', $columns, $rows);
        }
    }

    /**
     * Export table-type report to XLSX
     */
    private function exportTableXlsx($sheet, string $type, array $data, array $columns, int &$row, array $headerStyle): void
    {
        $prepared = $this->prepareTableRows($type, $data);
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
        foreach ($prepared as $dataRow) {
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
            $addTable = function(string $title, array $columns, array $rows) use (&$sheet, &$row, $headerStyle): void {
                if (empty($rows)) {
                    return;
                }
                $sheet->setCellValue('A' . $row, $title);
                $sheet->getStyle('A' . $row)->getFont()->setBold(true);
                $row++;

                $col = 'A';
                foreach ($columns as $label) {
                    $sheet->setCellValue($col . $row, $label);
                    $col++;
                }
                $lastCol = chr(ord('A') + count($columns) - 1);
                $sheet->getStyle("A{$row}:{$lastCol}{$row}")->applyFromArray($headerStyle);
                $row++;

                foreach ($rows as $item) {
                    $col = 'A';
                    foreach (array_keys($columns) as $key) {
                        $sheet->setCellValue($col . $row, $item[$key] ?? '');
                        $col++;
                    }
                    $row++;
                }
                $row += 2;
            };

            $addTable(__('By Manufacturer', 'dashboardng'), [
                'label' => __('Manufacturer', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_manufacturer'] ?? []);

            $addTable(__('By Status', 'dashboardng'), [
                'label' => __('Status', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_status'] ?? []);

            if (!empty($data['by_os'])) {
                $addTable(__('By Operating System', 'dashboardng'), [
                    'label' => __('Operating System', 'dashboardng'),
                    'count' => __('Count', 'dashboardng'),
                ], $data['by_os']);
            }

            if (!empty($data['by_type'])) {
                $addTable(__('By Type', 'dashboardng'), [
                    'label' => __('Type', 'dashboardng'),
                    'count' => __('Count', 'dashboardng'),
                ], $data['by_type']);
            }

            if (!empty($data['by_category'])) {
                $addTable(__('By Category', 'dashboardng'), [
                    'label' => __('Category', 'dashboardng'),
                    'count' => __('Count', 'dashboardng'),
                ], $data['by_category']);
            }

            $addTable(__('By Model', 'dashboardng'), [
                'label' => __('Model', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_model'] ?? []);

            if (!empty($data['recent_items'])) {
                $recentRows = [];
                foreach ($data['recent_items'] as $recentItem) {
                    $recentRows[] = [
                        'name' => $recentItem['name'] ?? '',
                        'serial' => $recentItem['serial'] ?? '',
                        'location' => $recentItem['location'] ?? '',
                        'status' => $recentItem['status'] ?? '',
                        'date_creation' => $recentItem['date_creation'] ?? '',
                    ];
                }

                $addTable(__('Recently Added', 'dashboardng'), [
                    'name' => __('Name', 'dashboardng'),
                    'serial' => __('Serial', 'dashboardng'),
                    'location' => __('Location', 'dashboardng'),
                    'status' => __('Status', 'dashboardng'),
                    'date_creation' => __('Created', 'dashboardng'),
                ], $recentRows);
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

        $this->addPdfSection($pdf, $type, $data, $config, $periodLabel, $displayTitle);

        // Output
        $pdf->Output($filename, 'D');
        exit;
    }

    /**
     * Add a report section to a PDF
     */
    private function addPdfSection(TCPDF $pdf, string $type, array $data, array $config, string $periodLabel, string $title): void
    {
        $pdf->AddPage();
        $pdf->SetFont('helvetica', 'B', 16);
        $pdf->Cell(0, 10, $title, 0, 1, 'C');

        $pdf->SetFont('helvetica', '', 10);
        $pdf->Cell(0, 6, __('Period', 'dashboardng') . ': ' . $periodLabel, 0, 1, 'C');
        $pdf->Cell(0, 6, __('Generated', 'dashboardng') . ': ' . date('Y-m-d H:i:s'), 0, 1, 'C');
        $pdf->Ln(5);

        if (($config['type'] ?? '') === 'summary') {
            $this->exportSummaryPdf($pdf, $type, $data);
        } elseif (($config['type'] ?? '') === 'multi_table') {
            $this->exportMultiTablePdf($pdf, $type, $data);
        } else {
            $this->exportTablePdf($pdf, $type, $data, $config['columns']);
        }
    }

    /**
     * Export summary-type report to PDF
     */
    private function exportSummaryPdf(TCPDF $pdf, string $type, array $data): void
    {
        $writeTable = function (string $title, string $tableType, array $columns, array $rows) use ($pdf): void {
            if (empty($rows)) {
                return;
            }
            $pdf->SetFont('helvetica', 'B', 12);
            $pdf->Cell(0, 8, $title, 0, 1, 'L');
            $pdf->SetFont('helvetica', '', 9);
            $this->exportTablePdf($pdf, $tableType, $rows, $columns);
            $pdf->Ln(5);
        };

        if ($type === 'overview') {
            $writeTable(__('By Type', 'dashboardng'), 'overview', [
                'label' => __('Type', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_type'] ?? []);

            $writeTable(__('By Status', 'dashboardng'), 'overview', [
                'label' => __('Status', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_status'] ?? []);
            return;
        }

        if ($type === 'sla') {
            $trendRows = [];
            foreach ($data['monthly_trend'] ?? [] as $row) {
                $trendRows[] = [
                    'label' => $row['label'] ?? '',
                    'total' => $row['total'] ?? 0,
                    'on_time' => $row['on_time'] ?? 0,
                    'late' => $row['late'] ?? 0,
                    'rate_display' => $this->formatPercent((float)($row['rate'] ?? 0)),
                ];
            }

            $writeTable(__('Monthly SLA Trend', 'dashboardng'), 'sla', [
                'label' => __('Month', 'dashboardng'),
                'total' => __('Total', 'dashboardng'),
                'on_time' => __('On Time', 'dashboardng'),
                'late' => __('Late', 'dashboardng'),
                'rate_display' => __('Rate', 'dashboardng'),
            ], $trendRows);
            return;
        }

        if ($type === 'task-overview') {
            $columns = [
                'label' => __('Category', 'dashboardng'),
                'count' => __('Tasks', 'dashboardng'),
                'total_time_display' => __('Time Spent', 'dashboardng'),
            ];
            $rows = $data['by_category'] ?? [];
            $writeTable(__('Tasks by Category', 'dashboardng'), 'task-overview', $columns, $rows);
            $writeTable(__('Category Breakdown', 'dashboardng'), 'task-overview', $columns, $rows);
        }
    }

    /**
     * Calculate column widths based on column type
     */
    private function calculateColumnWidths(array $columns): array
    {
        $widths = [];
        $weights = [];

        foreach (array_keys($columns) as $key) {
            if (in_array($key, ['completename', 'name', 'label'], true)) {
                $weights[$key] = 3;
            } elseif (in_array($key, ['share_display', 'resolution_rate_display', 'avg_resolution_display'], true)) {
                $weights[$key] = 1;
            } else {
                $weights[$key] = 2;
            }
        }

        $totalWeight = array_sum($weights);
        if ($totalWeight === 0) {
            foreach (array_keys($columns) as $key) {
                $widths[$key] = floor(100 / count($columns));
            }
            return $widths;
        }

        foreach ($weights as $key => $weight) {
            $widths[$key] = round(($weight / $totalWeight) * 100, 1);
        }

        $totalWidth = array_sum($widths);
        $diff = 100 - $totalWidth;
        if ($diff !== 0 && !empty($widths)) {
            $firstKey = array_key_first($widths);
            $widths[$firstKey] += $diff;
        }

        return $widths;
    }

    /**
     * Export table-type report to PDF
     */
    private function exportTablePdf(TCPDF $pdf, string $type, array $data, array $columns): void
    {
        $prepared = $this->prepareTableRows($type, $data);
        $columnWidths = $this->calculateColumnWidths($columns);

        $html = '<table border="1" cellpadding="4" width="100%">';

        $html .= '<tr style="background-color: #4472C4; color: white; font-weight: bold;">';
        foreach ($columns as $key => $label) {
            $width = $columnWidths[$key] ?? 10;
            $html .= '<th width="' . $width . '%">' . htmlspecialchars($label) . '</th>';
        }
        $html .= '</tr>';

        $rowNum = 0;
        foreach ($prepared as $row) {
            $bgColor = ($rowNum % 2 === 0) ? '#FFFFFF' : '#F2F2F2';
            $html .= '<tr style="background-color: ' . $bgColor . ';">';
            foreach (array_keys($columns) as $key) {
                $width = $columnWidths[$key] ?? 10;
                $value = $row[$key] ?? '';
                $html .= '<td width="' . $width . '%">' . htmlspecialchars((string)$value) . '</td>';
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
            $addTable = function (string $title, array $columns, array $rows) use ($pdf): void {
                if (empty($rows)) {
                    return;
                }
                $pdf->SetFont('helvetica', 'B', 12);
                $pdf->Cell(0, 8, $title, 0, 1, 'L');
                $pdf->SetFont('helvetica', '', 9);

                $columnWidths = $this->calculateColumnWidths($columns);

                $html = '<table border="1" cellpadding="4" width="100%">
                    <tr style="background-color: #4472C4; color: white; font-weight: bold;">';
                foreach ($columns as $key => $label) {
                    $width = $columnWidths[$key] ?? 10;
                    $html .= '<th width="' . $width . '%">' . htmlspecialchars($label) . '</th>';
                }
                $html .= '</tr>';

                foreach ($rows as $row) {
                    $html .= '<tr>';
                    foreach (array_keys($columns) as $key) {
                        $width = $columnWidths[$key] ?? 10;
                        $value = $row[$key] ?? '';
                        $html .= '<td width="' . $width . '%">' . htmlspecialchars((string)$value) . '</td>';
                    }
                    $html .= '</tr>';
                }
                $html .= '</table>';
                $pdf->writeHTML($html, true, false, true, false, '');
                $pdf->Ln(5);
            };

            $addTable(__('By Manufacturer', 'dashboardng'), [
                'label' => __('Manufacturer', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_manufacturer'] ?? []);

            $addTable(__('By Status', 'dashboardng'), [
                'label' => __('Status', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_status'] ?? []);

            if (!empty($data['by_os'])) {
                $addTable(__('By Operating System', 'dashboardng'), [
                    'label' => __('Operating System', 'dashboardng'),
                    'count' => __('Count', 'dashboardng'),
                ], $data['by_os']);
            }

            if (!empty($data['by_type'])) {
                $addTable(__('By Type', 'dashboardng'), [
                    'label' => __('Type', 'dashboardng'),
                    'count' => __('Count', 'dashboardng'),
                ], $data['by_type']);
            }

            if (!empty($data['by_category'])) {
                $addTable(__('By Category', 'dashboardng'), [
                    'label' => __('Category', 'dashboardng'),
                    'count' => __('Count', 'dashboardng'),
                ], $data['by_category']);
            }

            $addTable(__('By Model', 'dashboardng'), [
                'label' => __('Model', 'dashboardng'),
                'count' => __('Count', 'dashboardng'),
            ], $data['by_model'] ?? []);

            if (!empty($data['recent_items'])) {
                $recentRows = [];
                foreach ($data['recent_items'] as $recentItem) {
                    $recentRows[] = [
                        'name' => $recentItem['name'] ?? '',
                        'serial' => $recentItem['serial'] ?? '',
                        'location' => $recentItem['location'] ?? '',
                        'status' => $recentItem['status'] ?? '',
                        'date_creation' => $recentItem['date_creation'] ?? '',
                    ];
                }

                $addTable(__('Recently Added', 'dashboardng'), [
                    'name' => __('Name', 'dashboardng'),
                    'serial' => __('Serial', 'dashboardng'),
                    'location' => __('Location', 'dashboardng'),
                    'status' => __('Status', 'dashboardng'),
                    'date_creation' => __('Created', 'dashboardng'),
                ], $recentRows);
            }

            if (!empty($data['by_type'])) {
                $addTable('By Type', [
                    'label' => 'Type',
                    'count' => 'Count',
                ], $data['by_type']);
            }

            if (!empty($data['by_category'])) {
                $addTable('By Category', [
                    'label' => 'Category',
                    'count' => 'Count',
                ], $data['by_category']);
            }

            $addTable('By Model', [
                'label' => 'Model',
                'count' => 'Count',
            ], $data['by_model'] ?? []);

            if (!empty($data['recent_items'])) {
                $recentRows = [];
                foreach ($data['recent_items'] as $item) {
                    $recentRows[] = [
                        'name' => $item['name'] ?? '',
                        'serial' => $item['serial'] ?? '',
                        'location' => $item['location'] ?? '',
                        'status' => $item['status'] ?? '',
                        'date_creation' => $item['date_creation'] ?? '',
                    ];
                }

                $addTable('Recently Added', [
                    'name' => 'Name',
                    'serial' => 'Serial',
                    'location' => 'Location',
                    'status' => 'Status',
                    'date_creation' => 'Created',
                ], $recentRows);
            }
        }
    }

    /**
     * Export multiple reports to a ZIP of CSV files
     */
    private function exportBulkCsv(array $types, array $context, string $periodLabel, string $dateStamp): void
    {
        $tmpFile = tempnam(sys_get_temp_dir(), 'dashboardng_export_');
        if ($tmpFile === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Unable to create export archive']);
            return;
        }

        $zip = new \ZipArchive();
        if ($zip->open($tmpFile, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            http_response_code(500);
            echo json_encode(['error' => 'Unable to create export archive']);
            unlink($tmpFile);
            return;
        }

        foreach ($types as $type) {
            $config = $this->reportConfigs[$type];
            $data = $this->getReportData($type, $context);
            $content = $this->buildCsvContent($type, $data, $config, $periodLabel);
            $entryName = $this->generateBulkEntryFilename($type, 'csv', $context['itemtype'], $dateStamp);
            $zip->addFromString($entryName, $content);
        }

        $zip->close();

        $filename = $this->generateBulkFilename('zip', $dateStamp);
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');
        readfile($tmpFile);
        unlink($tmpFile);
        exit;
    }

    /**
     * Export multiple reports to a single XLSX workbook
     */
    private function exportBulkXlsx(array $types, array $context, string $periodLabel, string $dateStamp): void
    {
        $spreadsheet = new Spreadsheet();
        $usedTitles = [];
        $first = true;

        foreach ($types as $type) {
            $config = $this->reportConfigs[$type];
            $data = $this->getReportData($type, $context);
            $title = $this->getReportTitle($type, $context['itemtype']);
            $this->addXlsxSheet($spreadsheet, $type, $data, $config, $periodLabel, $title, $first, $usedTitles);
            $first = false;
        }

        $filename = $this->generateBulkFilename('xlsx', $dateStamp);
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer = new Xlsx($spreadsheet);
        $writer->setIncludeCharts(true);
        $writer->save('php://output');
        exit;
    }

    /**
     * Export multiple reports to a single PDF
     */
    private function exportBulkPdf(array $types, array $context, string $periodLabel, string $dateStamp): void
    {
        if (!class_exists('TCPDF')) {
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
        $pdf->SetCreator('DashboardNG');
        $pdf->SetAuthor($_SESSION['glpirealname'] ?? 'ITSM-NG');
        $pdf->SetTitle('DashboardNG Reports');
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(true);
        $pdf->SetMargins(10, 10, 10);

        foreach ($types as $type) {
            $config = $this->reportConfigs[$type];
            $data = $this->getReportData($type, $context);
            $title = $this->getReportTitle($type, $context['itemtype']);
            $this->addPdfSection($pdf, $type, $data, $config, $periodLabel, $title);
        }

        $filename = $this->generateBulkFilename('pdf', $dateStamp);
        $pdf->Output($filename, 'D');
        exit;
    }

    /**
     * Generate filename for bulk export
     */
    private function generateBulkFilename(string $extension, string $dateStamp): string
    {
        return "reports_bulk_{$dateStamp}.{$extension}";
    }

    /**
     * Generate filename for bulk export entries
     */
    private function generateBulkEntryFilename(string $type, string $format, string $itemtype, string $dateStamp): string
    {
        $safeType = $this->sanitizeFileSegment($type);
        $safeItemtype = $this->sanitizeFileSegment($itemtype);

        if ($type === 'asset-by-itemtype' && $safeItemtype !== '') {
            return "report_{$safeType}_{$safeItemtype}_{$dateStamp}.{$format}";
        }

        return "report_{$safeType}_{$dateStamp}.{$format}";
    }

    /**
     * Sanitize filename segments
     */
    private function sanitizeFileSegment(string $value): string
    {
        $sanitized = preg_replace('/[^A-Za-z0-9_-]+/', '_', $value);
        return trim((string) $sanitized, '_');
    }
}
