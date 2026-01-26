<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\Queries\ReportQueries;
use Entity;

class GetReports
{
    public function handle(string $type, array $params = []): array
    {
        $queries = new ReportQueries();
        $entities = $this->getEntities($params);
        $period = (int)($params['period'] ?? 0);
        $limit = (int)($params['limit'] ?? 50);
        $itemtype = $params['itemtype'] ?? 'Computer';
        $startDate = $params['start_date'] ?? null;
        $endDate = $params['end_date'] ?? null;

        // Debug info for troubleshooting
        $debug = [
            'requested_entities' => $params['entities'] ?? null,
            'resolved_entities' => $entities,
            'period' => $period,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'session_entities' => $_SESSION['glpiactiveentities'] ?? [],
        ];

        try {
            [$startDate, $endDate] = $queries->normalizeCustomPeriod(
                $startDate ? (string) $startDate : null,
                $endDate ? (string) $endDate : null
            );

            $data = match ($type) {
                // Ticket reports
                'overview'   => $queries->getOverviewReport($entities, $period, $startDate, $endDate),
                'entity'     => $queries->getEntityReport($entities, $period, $startDate, $endDate),
                'technician' => $queries->getTechnicianReport($entities, $period, $limit, $startDate, $endDate),
                'sla'        => $queries->getSlaReport($entities, $period, $startDate, $endDate),
                'category'   => $queries->getCategoryReport($entities, $period, $limit, $startDate, $endDate),
                'group'      => $queries->getGroupReport($entities, $period, $limit, $startDate, $endDate),
                'priority'   => $queries->getPriorityReport($entities, $period, $startDate, $endDate),
                'source'     => $queries->getSourceReport($entities, $period, $startDate, $endDate),
                'monthly'    => $queries->getMonthlyReport($entities, $period, $startDate, $endDate),
                
                // Asset reports
                'asset-by-itemtype'   => $queries->getAssetReportByItemtype($itemtype, $entities, $limit, $period, $startDate, $endDate),
                
                // Task reports
                'task-overview'       => $queries->getTaskOverviewReport($entities, $period, $startDate, $endDate),
                'task-by-technician'  => $queries->getTasksByTechnicianReport($entities, $period, $limit, $startDate, $endDate),
                'task-by-entity'      => $queries->getTasksByEntityReport($entities, $period, $limit, $startDate, $endDate),
                'task-by-ticket'      => $queries->getTasksByTicketReport($entities, $period, $limit, $startDate, $endDate),
                
                default      => ['error' => 'Unknown report type'],
            };
        } catch (\Exception $e) {
            return [
                'success'   => false,
                'type'      => $type,
                'data'      => [],
                'error'     => $e->getMessage(),
                'timestamp' => time(),
            ];
        }

        $periodRange = $queries->getPeriodRange($period, $startDate, $endDate);

        return [
            'success'   => !isset($data['error']),
            'type'      => $type,
            'data'      => $data,
            'timestamp' => time(),
            'meta'      => [
                'period_start' => $periodRange[0],
                'period_end' => $periodRange[1],
            ],
        ];
    }

    /**
     * Get entity IDs from params or session, with fallbacks
     *
     * @param array $params
     * @return array
     */
    private function getEntities(array $params): array
    {
        // If explicitly provided in params
        if (!empty($params['entities'])) {
            return array_map('intval', explode(',', $params['entities']));
        }

        // Try session active entities
        if (!empty($_SESSION['glpiactiveentities'])) {
            return $_SESSION['glpiactiveentities'];
        }

        // Fallback: get entities from active profile
        if (!empty($_SESSION['glpiactiveprofile']['id'])) {
            $profileId = $_SESSION['glpiactiveprofile']['id'];
            $userId = $_SESSION['glpiID'] ?? 0;
            
            if ($userId > 0) {
                // Try to get entities user has access to
                $entities = \Profile_User::getUserEntities($userId, true);
                if (!empty($entities)) {
                    return $entities;
                }
            }
        }

        // Last resort: no entity filter (include all accessible)
        return [];
    }
}
