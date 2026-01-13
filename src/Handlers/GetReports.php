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

        // Debug info for troubleshooting
        $debug = [
            'requested_entities' => $params['entities'] ?? null,
            'resolved_entities' => $entities,
            'period' => $period,
            'session_entities' => $_SESSION['glpiactiveentities'] ?? [],
        ];

        try {
            $data = match ($type) {
                // Ticket reports
                'overview'   => $queries->getOverviewReport($entities, $period),
                'entity'     => $queries->getEntityReport($entities, $period),
                'technician' => $queries->getTechnicianReport($entities, $period, $limit),
                'sla'        => $queries->getSlaReport($entities, $period),
                'category'   => $queries->getCategoryReport($entities, $period, $limit),
                'group'      => $queries->getGroupReport($entities, $period, $limit),
                'priority'   => $queries->getPriorityReport($entities, $period),
                'source'     => $queries->getSourceReport($entities, $period),
                'monthly'    => $queries->getMonthlyReport($entities, $period),
                
                // Asset reports - dynamic itemtype
                'asset-by-itemtype'   => $queries->getAssetReportByItemtype($itemtype, $entities, $limit),
                
                // Asset reports - legacy (kept for compatibility)
                'asset-overview'      => $queries->getAssetOverviewReport($entities),
                'asset-by-location'   => $queries->getAssetsByLocationReport($entities, $limit),
                'asset-by-entity'     => $queries->getAssetsByEntityReport($entities, $limit),
                'asset-by-status'     => $queries->getAssetsByStatusReport($entities),
                'asset-with-tickets'  => $queries->getAssetsWithTicketsReport($entities, $period, $limit),
                'computer-by-os'      => $queries->getComputersByOsReport($entities, $limit),
                'computer-by-type'    => $queries->getComputersByTypeReport($entities, $limit),
                'computer-by-manufacturer' => $queries->getComputersByManufacturerReport($entities, $limit),
                'monitor-by-manufacturer'  => $queries->getMonitorsByManufacturerReport($entities, $limit),
                'printer-by-manufacturer'  => $queries->getPrintersByManufacturerReport($entities, $limit),
                'network-by-manufacturer'  => $queries->getNetworkEquipmentByManufacturerReport($entities, $limit),
                
                // Task reports
                'task-overview'       => $queries->getTaskOverviewReport($entities, $period),
                'task-by-technician'  => $queries->getTasksByTechnicianReport($entities, $period, $limit),
                'task-by-entity'      => $queries->getTasksByEntityReport($entities, $period, $limit),
                'task-by-ticket'      => $queries->getTasksByTicketReport($entities, $period, $limit),
                
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

        return [
            'success'   => !isset($data['error']),
            'type'      => $type,
            'data'      => $data,
            'timestamp' => time(),
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
