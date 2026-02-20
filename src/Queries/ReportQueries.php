<?php

namespace GlpiPlugin\Dashboardng\Queries;

use Ticket;
use Entity;
use QueryExpression;
use Computer;
use Monitor;
use Printer;
use NetworkEquipment;
use Phone;
use Peripheral;

/**
 * Report-related SQL queries
 */
class ReportQueries
{
    /**
     * Normalize a date string in Y-m-d format
     */
    private function normalizeDate(?string $date): ?string
    {
        if ($date === null || $date === '') {
            return null;
        }

        $parsed = \DateTime::createFromFormat('Y-m-d', $date);
        if ($parsed === false || $parsed->format('Y-m-d') !== $date) {
            return null;
        }

        return $parsed->format('Y-m-d');
    }

    /**
     * Normalize and order a date range
     *
     * @return array{0:?string,1:?string}
     */
    private function normalizeDateRange(?string $startDate, ?string $endDate): array
    {
        $start = $this->normalizeDate($startDate);
        $end = $this->normalizeDate($endDate);

        if ($start && !$end) {
            $end = date('Y-m-d');
        }

        if (!$start && $end) {
            $start = $end;
        }

        if ($start && $end && $start > $end) {
            [$start, $end] = [$end, $start];
        }

        return [$start, $end];
    }

    /**
     * Normalize a period payload for custom ranges
     *
     * @return array{0:?string,1:?string}
     */
    public function normalizeCustomPeriod(?string $startDate, ?string $endDate): array
    {
        return $this->normalizeDateRange($startDate, $endDate);
    }

    /**
     * Get a normalized date range for a period selection
     *
     * @return array{0:?string,1:?string}
     */
    public function getPeriodRange(int $period, ?string $startDate = null, ?string $endDate = null): array
    {
        [$rangeStart, $rangeEnd] = $this->getPeriodDates($period, $startDate, $endDate);

        return [
            $rangeStart ? substr($rangeStart, 0, 10) : null,
            $rangeEnd ? substr($rangeEnd, 0, 10) : null,
        ];
    }

    /**
     * Get period filter based on period type or explicit range
     *
     * @param int $period Period type (0-7)
     * @param string|null $startDate Custom start date (Y-m-d)
     * @param string|null $endDate Custom end date (Y-m-d)
     * @return array [start date, end date]
     */
    private function getPeriodDates(int $period, ?string $startDate = null, ?string $endDate = null): array
    {
        [$customStart, $customEnd] = $this->normalizeDateRange($startDate, $endDate);
        if ($customStart !== null || $customEnd !== null) {
            return [
                $customStart ? "$customStart 00:00:00" : null,
                $customEnd ? "$customEnd 23:59:59" : null,
            ];
        }

        $today = date('Y-m-d');
        $thisMonth = date('Y-m-01');
        $thisYear = date('Y-01-01');
        $lastWeek = date('Y-m-d', strtotime('-7 days'));
        $last15 = date('Y-m-d', strtotime('-15 days'));
        $last30 = date('Y-m-d', strtotime('-30 days'));
        $last90 = date('Y-m-d', strtotime('-90 days'));
        $last180 = date('Y-m-d', strtotime('-180 days'));

        return match ($period) {
            1 => ["$thisYear 00:00:00", "$today 23:59:59"],
            2 => ["$thisMonth 00:00:00", "$today 23:59:59"],
            3 => ["$lastWeek 00:00:00", "$today 23:59:59"],
            4 => ["$last15 00:00:00", "$today 23:59:59"],
            5 => ["$last30 00:00:00", "$today 23:59:59"],
            6 => ["$last90 00:00:00", "$today 23:59:59"],
            7 => ["$last180 00:00:00", "$today 23:59:59"],
            default => [null, null],
        };
    }

    /**
     * Build base where clause for ticket queries
     * 
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @param string $tableAlias Table alias (e.g., 'glpi_tickets' or just empty for unqualified)
     * @return array WHERE clause array
     */
    private function buildBaseWhere(array $entities, int $period, string $tableAlias = '', ?string $startDate = null, ?string $endDate = null): array
    {
        $prefix = $tableAlias ? "$tableAlias." : '';
        
        $where = ["{$prefix}is_deleted" => 0];
        
        // Handle entities - if empty array, don't filter by entity (show all accessible)
        if (!empty($entities)) {
            $where["{$prefix}entities_id"] = $entities;
        }
        
        [$dateStart, $dateEnd] = $this->getPeriodDates($period, $startDate, $endDate);
        if ($dateStart !== null) {
            $dateField = $tableAlias ? "{$tableAlias}.date" : 'glpi_tickets.date';
            $where[] = new QueryExpression("$dateField BETWEEN '$dateStart' AND '$dateEnd'");
        }
        
        return $where;
    }

    /**
     * Safely fetch first row from a DB iterator
     */
    private function getFirstRow($iterator): array
    {
        if (!$iterator) {
            return [];
        }

        // Ensure pointer at first row
        if (method_exists($iterator, 'rewind')) {
            $iterator->rewind();
        }

        if (method_exists($iterator, 'current')) {
            $row = $iterator->current();
            return is_array($row) ? $row : (array)$row;
        }

        return [];
    }

    /**
     * Get overview report with summary statistics
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @return array
     */
    public function getOverviewReport(array $entities, int $period = 0, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;
 
        $where = $this->buildBaseWhere($entities, $period, '', $startDate, $endDate);


        // Total tickets
        $result = $DB->request([
            'COUNT' => 'total',
            'FROM'  => 'glpi_tickets',
            'WHERE' => $where,
        ]);
        $row = $this->getFirstRow($result);
        $totalTickets = (int)($row['total'] ?? 0);

        // Resolved tickets
        $whereResolved = $where;
        $whereResolved['status'] = [Ticket::SOLVED, Ticket::CLOSED];
        $result = $DB->request([
            'COUNT' => 'total',
            'FROM'  => 'glpi_tickets',
            'WHERE' => $whereResolved,
        ]);
        $row = $this->getFirstRow($result);
        $resolvedTickets = (int)($row['total'] ?? 0);

        // Open tickets (backlog)
        $whereOpen = $where;
        $whereOpen['status'] = ['NOT IN', [Ticket::SOLVED, Ticket::CLOSED]];
        $result = $DB->request([
            'COUNT' => 'total',
            'FROM'  => 'glpi_tickets',
            'WHERE' => $whereOpen,
        ]);
        $row = $this->getFirstRow($result);
        $openTickets = (int)($row['total'] ?? 0);

        // Average resolution time (in hours)
        $whereAvg = $where;
        $whereAvg[] = new QueryExpression('solvedate IS NOT NULL');
        $result = $DB->request([
            'SELECT' => [
                new QueryExpression('AVG(TIMESTAMPDIFF(HOUR, date, solvedate)) AS avg_hours'),
            ],
            'FROM'  => 'glpi_tickets',
            'WHERE' => $whereAvg,
        ]);
        $row = $this->getFirstRow($result);
        $avgResolutionTime = round((float)($row['avg_hours'] ?? 0), 1);

        // By type
        $result = $DB->request([
            'SELECT' => ['type', new QueryExpression('COUNT(id) AS count')],
            'FROM'   => 'glpi_tickets',
            'WHERE'  => $where,
            'GROUPBY' => 'type',
        ]);
        $byType = [];
        foreach ($result as $row) {
            $byType[] = [
                'type' => (int)$row['type'],
                'label' => $row['type'] == Ticket::INCIDENT_TYPE ? __('Incident') : __('Request'),
                'count' => (int)$row['count'],
            ];
        }

        // By status
        $result = $DB->request([
            'SELECT' => ['status', new QueryExpression('COUNT(id) AS count')],
            'FROM'   => 'glpi_tickets',
            'WHERE'  => $where,
            'GROUPBY' => 'status',
        ]);
        $byStatus = [];
        foreach ($result as $row) {
            $byStatus[] = [
                'status' => (int)$row['status'],
                'label' => Ticket::getStatus($row['status']),
                'count' => (int)$row['count'],
            ];
        }

        return [
            'total_tickets'       => $totalTickets,
            'resolved_tickets'    => $resolvedTickets,
            'open_tickets'        => $openTickets,
            'resolution_rate'     => $totalTickets > 0 ? round(($resolvedTickets / $totalTickets) * 100, 1) : 0,
            'avg_resolution_time' => $avgResolutionTime,
            'by_type'             => $byType,
            'by_status'           => $byStatus,
        ];
    }

    /**
     * Get entity-based report
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @return array
     */
    public function getEntityReport(array $entities, int $period = 0, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;
 
        $where = $this->buildBaseWhere($entities, $period, 'glpi_tickets', $startDate, $endDate);


        $solvedStatus = Ticket::SOLVED . ',' . Ticket::CLOSED;
        
        $result = $DB->request([
            'SELECT' => [
                'glpi_entities.id',
                'glpi_entities.name',
                'glpi_entities.completename',
                new QueryExpression('COUNT(glpi_tickets.id) AS total_tickets'),
                new QueryExpression("SUM(CASE WHEN glpi_tickets.status IN ($solvedStatus) THEN 1 ELSE 0 END) AS resolved_tickets"),
                new QueryExpression("SUM(CASE WHEN glpi_tickets.status NOT IN ($solvedStatus) THEN 1 ELSE 0 END) AS open_tickets"),
                new QueryExpression('AVG(CASE WHEN glpi_tickets.solvedate IS NOT NULL THEN TIMESTAMPDIFF(HOUR, glpi_tickets.date, glpi_tickets.solvedate) ELSE NULL END) AS avg_resolution_hours'),
            ],
            'FROM'   => 'glpi_tickets',
            'LEFT JOIN' => [
                'glpi_entities' => [
                    'ON' => [
                        'glpi_tickets' => 'entities_id',
                        'glpi_entities' => 'id',
                    ],
                ],
            ],
            'WHERE'  => $where,
            'GROUPBY' => ['glpi_tickets.entities_id'],
            'ORDER'  => ['total_tickets DESC'],
        ]);

        $data = [];
        foreach ($result as $row) {
            $total = (int)$row['total_tickets'];
            $resolved = (int)$row['resolved_tickets'];
            
            $data[] = [
                'id'                  => (int)($row['id'] ?? 0),
                'name'                => $row['name'] ?? __('Root entity'),
                'completename'        => $row['completename'] ?? __('Root entity'),
                'total_tickets'       => $total,
                'resolved_tickets'    => $resolved,
                'open_tickets'        => (int)$row['open_tickets'],
                'resolution_rate'     => $total > 0 ? round(($resolved / $total) * 100, 1) : 0,
                'avg_resolution_hours' => round((float)($row['avg_resolution_hours'] ?? 0), 1),
            ];
        }

        return $data;
    }

    /**
     * Get technician performance report
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @param int $limit Max results
     * @return array
     */
    public function getTechnicianReport(array $entities, int $period = 0, int $limit = 50, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;
 
        $where = $this->buildBaseWhere($entities, $period, 'glpi_tickets', $startDate, $endDate);

        $where['glpi_tickets_users.type'] = 2; // Technician

        $solvedStatus = Ticket::SOLVED . ',' . Ticket::CLOSED;
        
        $result = $DB->request([
            'SELECT' => [
                'glpi_users.id',
                'glpi_users.name AS username',
                'glpi_users.firstname',
                'glpi_users.realname',
                new QueryExpression('COUNT(DISTINCT glpi_tickets.id) AS total_tickets'),
                new QueryExpression("SUM(CASE WHEN glpi_tickets.status IN ($solvedStatus) THEN 1 ELSE 0 END) AS resolved_tickets"),
                new QueryExpression("SUM(CASE WHEN glpi_tickets.status NOT IN ($solvedStatus) THEN 1 ELSE 0 END) AS open_tickets"),
                new QueryExpression('AVG(CASE WHEN glpi_tickets.solvedate IS NOT NULL THEN TIMESTAMPDIFF(HOUR, glpi_tickets.date, glpi_tickets.solvedate) ELSE NULL END) AS avg_resolution_hours'),
            ],
            'FROM'   => 'glpi_tickets_users',
            'INNER JOIN' => [
                'glpi_tickets' => [
                    'ON' => [
                        'glpi_tickets_users' => 'tickets_id',
                        'glpi_tickets' => 'id',
                    ],
                ],
                'glpi_users' => [
                    'ON' => [
                        'glpi_tickets_users' => 'users_id',
                        'glpi_users' => 'id',
                    ],
                ],
            ],
            'WHERE'  => $where,
            'GROUPBY' => ['glpi_users.id'],
            'ORDER'  => ['total_tickets DESC'],
            'LIMIT'  => $limit,
        ]);

        $data = [];
        foreach ($result as $row) {
            $displayName = trim(($row['firstname'] ?? '') . ' ' . ($row['realname'] ?? ''));
            if (empty($displayName)) {
                $displayName = $row['username'] ?? __('Unknown');
            }

            $total = (int)$row['total_tickets'];
            $resolved = (int)$row['resolved_tickets'];

            $data[] = [
                'id'                   => (int)$row['id'],
                'name'                 => $displayName,
                'username'             => $row['username'],
                'total_tickets'        => $total,
                'resolved_tickets'     => $resolved,
                'open_tickets'         => (int)$row['open_tickets'],
                'resolution_rate'      => $total > 0 ? round(($resolved / $total) * 100, 1) : 0,
                'avg_resolution_hours' => round((float)($row['avg_resolution_hours'] ?? 0), 1),
            ];
        }

        return $data;
    }

    /**
     * Get SLA compliance report
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @return array
     */
    public function getSlaReport(array $entities, int $period = 0, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;
 
        $where = $this->buildBaseWhere($entities, $period, '', $startDate, $endDate);

        $where[] = new QueryExpression('time_to_resolve IS NOT NULL');

        // Total with SLA
        $result = $DB->request([
            'COUNT' => 'total',
            'FROM'  => 'glpi_tickets',
            'WHERE' => $where,
        ]);
        $row = $this->getFirstRow($result);
        $totalWithSla = (int)($row['total'] ?? 0);

        // Resolved tickets with SLA
        $whereResolved = $where;
        $whereResolved['status'] = [Ticket::SOLVED, Ticket::CLOSED];
        $result = $DB->request([
            'COUNT' => 'total',
            'FROM'  => 'glpi_tickets',
            'WHERE' => $whereResolved,
        ]);
        $row = $this->getFirstRow($result);
        $resolvedWithSla = (int)($row['total'] ?? 0);

        // Late (solved after deadline)
        $whereLate = $whereResolved;
        $whereLate[] = new QueryExpression('solvedate > time_to_resolve');
        $result = $DB->request([
            'COUNT' => 'late',
            'FROM'  => 'glpi_tickets',
            'WHERE' => $whereLate,
        ]);
        $row = $this->getFirstRow($result);
        $lateTickets = (int)($row['late'] ?? 0);

        // Currently overdue (open and past deadline)
        $whereOverdue = $where;
        $whereOverdue['status'] = ['NOT IN', [Ticket::SOLVED, Ticket::CLOSED]];
        $whereOverdue['time_to_resolve'] = ['<', date('Y-m-d H:i:s')];
        $result = $DB->request([
            'COUNT' => 'overdue',
            'FROM'  => 'glpi_tickets',
            'WHERE' => $whereOverdue,
        ]);
        $row = $this->getFirstRow($result);
        $overdueTickets = (int)($row['overdue'] ?? 0);

        $onTime = $resolvedWithSla - $lateTickets;
        $complianceRate = $resolvedWithSla > 0 ? round(($onTime / $resolvedWithSla) * 100, 1) : 0;

        // Monthly trend
        $monthlyTrend = [];
        $solvedStatus = Ticket::SOLVED . ',' . Ticket::CLOSED;
        $trendWhere = $where;
        $trendWhere['status'] = [Ticket::SOLVED, Ticket::CLOSED];
        
        $result = $DB->request([
            'SELECT' => [
                new QueryExpression("DATE_FORMAT(date, '%Y-%m') AS month"),
                new QueryExpression("DATE_FORMAT(date, '%b %Y') AS label"),
                new QueryExpression('COUNT(*) AS total'),
                new QueryExpression('SUM(CASE WHEN solvedate IS NOT NULL AND solvedate <= time_to_resolve THEN 1 ELSE 0 END) AS on_time'),
                new QueryExpression('SUM(CASE WHEN solvedate IS NOT NULL AND solvedate > time_to_resolve THEN 1 ELSE 0 END) AS late'),
            ],
            'FROM'  => 'glpi_tickets',
            'WHERE' => $trendWhere,
            'GROUPBY' => ['month'],
            'ORDER'  => ['month ASC'],
            'LIMIT'  => 12,
        ]);

        foreach ($result as $row) {
            $monthlyTrend[] = [
                'month'     => $row['month'],
                'label'     => $row['label'],
                'total'     => (int)$row['total'],
                'on_time'   => (int)$row['on_time'],
                'late'      => (int)$row['late'],
                'rate'      => (int)$row['total'] > 0 ? round(((int)$row['on_time'] / (int)$row['total']) * 100, 1) : 0,
            ];
        }

        return [
            'total_with_sla'    => $totalWithSla,
            'resolved_with_sla' => $resolvedWithSla,
            'on_time'           => $onTime,
            'late'              => $lateTickets,
            'overdue'           => $overdueTickets,
            'compliance_rate'   => $complianceRate,
            'monthly_trend'     => $monthlyTrend,
        ];
    }

    /**
     * Get category-based report
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @param int $limit Max results
     * @return array
     */
    public function getCategoryReport(array $entities, int $period = 0, int $limit = 50, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;
 
        $where = $this->buildBaseWhere($entities, $period, 'glpi_tickets', $startDate, $endDate);


        // Get total for percentage calculation
        $result = $DB->request([
            'COUNT' => 'total',
            'FROM'  => 'glpi_tickets',
            'WHERE' => $where,
        ]);
        $row = $result->current();
        $grandTotal = (int)($row['total'] ?? 0);

        $solvedStatus = Ticket::SOLVED . ',' . Ticket::CLOSED;
        
        $result = $DB->request([
            'SELECT' => [
                'glpi_itilcategories.id',
                'glpi_itilcategories.name',
                'glpi_itilcategories.completename',
                new QueryExpression('COUNT(glpi_tickets.id) AS total_tickets'),
                new QueryExpression("SUM(CASE WHEN glpi_tickets.status IN ($solvedStatus) THEN 1 ELSE 0 END) AS resolved_tickets"),
                new QueryExpression('AVG(CASE WHEN glpi_tickets.solvedate IS NOT NULL THEN TIMESTAMPDIFF(HOUR, glpi_tickets.date, glpi_tickets.solvedate) ELSE NULL END) AS avg_resolution_hours'),
            ],
            'FROM'   => 'glpi_tickets',
            'LEFT JOIN' => [
                'glpi_itilcategories' => [
                    'ON' => [
                        'glpi_tickets' => 'itilcategories_id',
                        'glpi_itilcategories' => 'id',
                    ],
                ],
            ],
            'WHERE'  => $where,
            'GROUPBY' => ['glpi_tickets.itilcategories_id'],
            'ORDER'  => ['total_tickets DESC'],
            'LIMIT'  => $limit,
        ]);

        $data = [];
        foreach ($result as $row) {
            $total = (int)$row['total_tickets'];
            $resolved = (int)$row['resolved_tickets'];

            $data[] = [
                'id'                   => (int)($row['id'] ?? 0),
                'name'                 => $row['name'] ?? __('No category'),
                'completename'         => $row['completename'] ?? __('No category'),
                'total_tickets'        => $total,
                'resolved_tickets'     => $resolved,
                'resolution_rate'      => $total > 0 ? round(($resolved / $total) * 100, 1) : 0,
                'percentage'           => $grandTotal > 0 ? round(($total / $grandTotal) * 100, 1) : 0,
                'avg_resolution_hours' => round((float)($row['avg_resolution_hours'] ?? 0), 1),
            ];
        }

        return $data;
    }

    /**
     * Get group-based report
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @param int $limit Max results
     * @return array
     */
    public function getGroupReport(array $entities, int $period = 0, int $limit = 50, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;
 
        $where = $this->buildBaseWhere($entities, $period, 'glpi_tickets', $startDate, $endDate);

        $where['glpi_groups_tickets.type'] = 2; // Assigned group

        $solvedStatus = Ticket::SOLVED . ',' . Ticket::CLOSED;
        
        $result = $DB->request([
            'SELECT' => [
                'glpi_groups.id',
                'glpi_groups.name',
                'glpi_groups.completename',
                new QueryExpression('COUNT(DISTINCT glpi_tickets.id) AS total_tickets'),
                new QueryExpression("SUM(CASE WHEN glpi_tickets.status IN ($solvedStatus) THEN 1 ELSE 0 END) AS resolved_tickets"),
                new QueryExpression("SUM(CASE WHEN glpi_tickets.status NOT IN ($solvedStatus) THEN 1 ELSE 0 END) AS open_tickets"),
            ],
            'FROM'   => 'glpi_groups_tickets',
            'INNER JOIN' => [
                'glpi_tickets' => [
                    'ON' => [
                        'glpi_groups_tickets' => 'tickets_id',
                        'glpi_tickets' => 'id',
                    ],
                ],
                'glpi_groups' => [
                    'ON' => [
                        'glpi_groups_tickets' => 'groups_id',
                        'glpi_groups' => 'id',
                    ],
                ],
            ],
            'WHERE'  => $where,
            'GROUPBY' => ['glpi_groups.id'],
            'ORDER'  => ['total_tickets DESC'],
            'LIMIT'  => $limit,
        ]);

        $data = [];
        foreach ($result as $row) {
            $total = (int)$row['total_tickets'];
            $resolved = (int)$row['resolved_tickets'];

            $data[] = [
                'id'               => (int)$row['id'],
                'name'             => $row['name'] ?? __('No group'),
                'completename'     => $row['completename'] ?? __('No group'),
                'total_tickets'    => $total,
                'resolved_tickets' => $resolved,
                'open_tickets'     => (int)$row['open_tickets'],
                'resolution_rate'  => $total > 0 ? round(($resolved / $total) * 100, 1) : 0,
            ];
        }

        return $data;
    }

    /**
     * Get priority-based report
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @return array
     */
    public function getPriorityReport(array $entities, int $period = 0, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;
 
        $where = $this->buildBaseWhere($entities, $period, '', $startDate, $endDate);


        $solvedStatus = Ticket::SOLVED . ',' . Ticket::CLOSED;
        
        $result = $DB->request([
            'SELECT' => [
                'priority',
                new QueryExpression('COUNT(id) AS total_tickets'),
                new QueryExpression("SUM(CASE WHEN status IN ($solvedStatus) THEN 1 ELSE 0 END) AS resolved_tickets"),
                new QueryExpression('AVG(CASE WHEN solvedate IS NOT NULL THEN TIMESTAMPDIFF(HOUR, date, solvedate) ELSE NULL END) AS avg_resolution_hours'),
            ],
            'FROM'   => 'glpi_tickets',
            'WHERE'  => $where,
            'GROUPBY' => ['priority'],
            'ORDER'  => ['priority ASC'],
        ]);

        $data = [];
        foreach ($result as $row) {
            $total = (int)$row['total_tickets'];
            $resolved = (int)$row['resolved_tickets'];

            $data[] = [
                'priority'             => (int)$row['priority'],
                'label'                => Ticket::getPriorityName($row['priority']),
                'total_tickets'        => $total,
                'resolved_tickets'     => $resolved,
                'resolution_rate'      => $total > 0 ? round(($resolved / $total) * 100, 1) : 0,
                'avg_resolution_hours' => round((float)($row['avg_resolution_hours'] ?? 0), 1),
            ];
        }

        return $data;
    }

    /**
     * Get source-based report
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @return array
     */
    public function getSourceReport(array $entities, int $period = 0, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;
 
        $where = $this->buildBaseWhere($entities, $period, 'glpi_tickets', $startDate, $endDate);


        $result = $DB->request([
            'SELECT' => [
                'glpi_requesttypes.id',
                'glpi_requesttypes.name',
                new QueryExpression('COUNT(glpi_tickets.id) AS total_tickets'),
            ],
            'FROM'   => 'glpi_tickets',
            'LEFT JOIN' => [
                'glpi_requesttypes' => [
                    'ON' => [
                        'glpi_tickets' => 'requesttypes_id',
                        'glpi_requesttypes' => 'id',
                    ],
                ],
            ],
            'WHERE'  => $where,
            'GROUPBY' => ['glpi_tickets.requesttypes_id'],
            'ORDER'  => ['total_tickets DESC'],
        ]);

        $data = [];
        foreach ($result as $row) {
            $data[] = [
                'id'            => (int)($row['id'] ?? 0),
                'name'          => $row['name'] ?? __('Unknown'),
                'total_tickets' => (int)$row['total_tickets'],
            ];
        }

        return $data;
    }

    /**
     * Get monthly trend report
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @return array
     */
    public function getMonthlyReport(array $entities, int $period = 0, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;
 
        $where = $this->buildBaseWhere($entities, $period, '', $startDate, $endDate);


        $solvedStatus = Ticket::SOLVED . ',' . Ticket::CLOSED;
        
        $result = $DB->request([
            'SELECT' => [
                new QueryExpression("DATE_FORMAT(date, '%Y-%m') AS month"),
                new QueryExpression("DATE_FORMAT(date, '%b %Y') AS label"),
                new QueryExpression('COUNT(*) AS total_tickets'),
                new QueryExpression("SUM(CASE WHEN status IN ($solvedStatus) THEN 1 ELSE 0 END) AS resolved_tickets"),
                new QueryExpression('AVG(CASE WHEN solvedate IS NOT NULL THEN TIMESTAMPDIFF(HOUR, date, solvedate) ELSE NULL END) AS avg_resolution_hours'),
            ],
            'FROM'  => 'glpi_tickets',
            'WHERE' => $where,
            'GROUPBY' => ['month'],
            'ORDER'  => ['month ASC'],
        ]);

        $data = [];
        foreach ($result as $row) {
            $total = (int)$row['total_tickets'];
            $resolved = (int)$row['resolved_tickets'];

            $data[] = [
                'month'                => $row['month'],
                'label'                => $row['label'],
                'total_tickets'        => $total,
                'resolved_tickets'     => $resolved,
                'resolution_rate'      => $total > 0 ? round(($resolved / $total) * 100, 1) : 0,
                'avg_resolution_hours' => round((float)($row['avg_resolution_hours'] ?? 0), 1),
            ];
        }

        return $data;
    }

    // ========================================
    // Asset Report Methods
    // ========================================

    /**
     * Build base where clause for asset queries
     * 
     * @param array $entities Entity IDs
     * @param string $tableAlias Table alias
     * @return array WHERE clause array
     */
    private function buildAssetBaseWhere(
        array $entities,
        string $tableAlias = '',
        int $period = 0,
        ?string $startDate = null,
        ?string $endDate = null
    ): array {
        $prefix = $tableAlias ? "$tableAlias." : '';
        
        $where = [
            "{$prefix}is_deleted" => 0,
            "{$prefix}is_template" => 0,
        ];
        
        if (!empty($entities)) {
            $where["{$prefix}entities_id"] = $entities;
        }

        [$dateStart, $dateEnd] = $this->getPeriodDates($period, $startDate, $endDate);
        if ($dateStart !== null) {
            $dateField = $tableAlias ? "{$tableAlias}.date_creation" : 'glpi_assets.date_creation';
            $where[] = new QueryExpression("$dateField BETWEEN '$dateStart' AND '$dateEnd'");
        }
        
        return $where;
    }

    // ========================================
    // Task Report Methods
    // ========================================

    /**
     * Get task overview report
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @return array
     */
    public function getTaskOverviewReport(array $entities, int $period = 0, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;
 
        [$dateStart, $dateEnd] = $this->getPeriodDates($period, $startDate, $endDate);


        $where = ['glpi_tickets.is_deleted' => 0];
        if (!empty($entities)) {
            $where['glpi_tickets.entities_id'] = $entities;
        }
        if ($dateStart !== null) {
            $where[] = ['glpi_tickettasks.date' => ['>=', $dateStart]];
            $where[] = ['glpi_tickettasks.date' => ['<=', $dateEnd]];
        }

        // Total tasks
        $result = $DB->request([
            'COUNT' => 'total',
            'FROM'  => 'glpi_tickettasks',
            'INNER JOIN' => [
                'glpi_tickets' => [
                    'ON' => [
                        'glpi_tickettasks' => 'tickets_id',
                        'glpi_tickets' => 'id',
                    ],
                ],
            ],
            'WHERE' => $where,
        ]);
        $row = $result->next();
        $totalTasks = (int)($row['total'] ?? 0);

        // Total time spent
        $result = $DB->request([
            'SELECT' => [
                new QueryExpression('SUM(glpi_tickettasks.actiontime) AS total_time'),
            ],
            'FROM'  => 'glpi_tickettasks',
            'INNER JOIN' => [
                'glpi_tickets' => [
                    'ON' => [
                        'glpi_tickettasks' => 'tickets_id',
                        'glpi_tickets' => 'id',
                    ],
                ],
            ],
            'WHERE' => $where,
        ]);
        $row = $result->next();
        $totalTime = (int)($row['total_time'] ?? 0);

        // Tasks by category
        $result = $DB->request([
            'SELECT' => [
                'glpi_taskcategories.name AS category_name',
                new QueryExpression('COUNT(glpi_tickettasks.id) AS count'),
                new QueryExpression('SUM(glpi_tickettasks.actiontime) AS total_time'),
            ],
            'FROM'  => 'glpi_tickettasks',
            'INNER JOIN' => [
                'glpi_tickets' => [
                    'ON' => [
                        'glpi_tickettasks' => 'tickets_id',
                        'glpi_tickets' => 'id',
                    ],
                ],
            ],
            'LEFT JOIN' => [
                'glpi_taskcategories' => [
                    'ON' => [
                        'glpi_taskcategories' => 'id',
                        'glpi_tickettasks' => 'taskcategories_id',
                    ],
                ],
            ],
            'WHERE' => $where,
            'GROUPBY' => ['glpi_tickettasks.taskcategories_id'],
            'ORDER' => ['count DESC'],
        ]);

        $byCategory = [];
        foreach ($result as $row) {
            $byCategory[] = [
                'label'      => $row['category_name'] ?? __('No category'),
                'count'      => (int)$row['count'],
                'total_time' => (int)$row['total_time'],
            ];
        }

        return [
            'total_tasks'      => $totalTasks,
            'total_time'       => $totalTime,
            'total_time_hours' => round($totalTime / 3600, 1),
            'by_category'      => $byCategory,
        ];
    }

    /**
     * Get tasks by technician report
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @param int $limit Max results
     * @return array
     */
    public function getTasksByTechnicianReport(array $entities, int $period = 0, int $limit = 50, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;
 
        [$dateStart, $dateEnd] = $this->getPeriodDates($period, $startDate, $endDate);


        $where = ['glpi_tickets.is_deleted' => 0];
        if (!empty($entities)) {
            $where['glpi_tickets.entities_id'] = $entities;
        }
        if ($dateStart !== null) {
            $where[] = ['glpi_tickettasks.date' => ['>=', $dateStart]];
            $where[] = ['glpi_tickettasks.date' => ['<=', $dateEnd]];
        }

        $result = $DB->request([
            'SELECT' => [
                'glpi_users.id',
                'glpi_users.name AS username',
                'glpi_users.firstname',
                'glpi_users.realname',
                new QueryExpression('COUNT(glpi_tickettasks.id) AS task_count'),
                new QueryExpression('SUM(glpi_tickettasks.actiontime) AS total_time'),
            ],
            'FROM'   => 'glpi_tickettasks',
            'INNER JOIN' => [
                'glpi_tickets' => [
                    'ON' => [
                        'glpi_tickettasks' => 'tickets_id',
                        'glpi_tickets' => 'id',
                    ],
                ],
                'glpi_users' => [
                    'ON' => [
                        'glpi_users' => 'id',
                        'glpi_tickettasks' => 'users_id_tech',
                    ],
                ],
            ],
            'WHERE'  => $where,
            'GROUPBY' => ['glpi_tickettasks.users_id_tech'],
            'ORDER'  => ['task_count DESC'],
            'LIMIT'  => $limit,
        ]);

        $data = [];
        foreach ($result as $row) {
            $displayName = trim(($row['firstname'] ?? '') . ' ' . ($row['realname'] ?? ''));
            if (empty($displayName)) {
                $displayName = $row['username'] ?? __('Unknown');
            }

            $data[] = [
                'id'              => (int)$row['id'],
                'name'            => $displayName,
                'task_count'      => (int)$row['task_count'],
                'total_time'      => (int)$row['total_time'],
                'total_time_hours' => round((int)$row['total_time'] / 3600, 1),
            ];
        }

        return $data;
    }

    /**
     * Get tasks by entity report
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @param int $limit Max results
     * @return array
     */
    public function getTasksByEntityReport(array $entities, int $period = 0, int $limit = 50, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;
 
        [$dateStart, $dateEnd] = $this->getPeriodDates($period, $startDate, $endDate);


        $where = ['glpi_tickets.is_deleted' => 0];
        if (!empty($entities)) {
            $where['glpi_tickets.entities_id'] = $entities;
        }
        if ($dateStart !== null) {
            $where[] = ['glpi_tickettasks.date' => ['>=', $dateStart]];
            $where[] = ['glpi_tickettasks.date' => ['<=', $dateEnd]];
        }

        $result = $DB->request([
            'SELECT' => [
                'glpi_entities.id',
                'glpi_entities.name',
                'glpi_entities.completename',
                new QueryExpression('COUNT(glpi_tickettasks.id) AS task_count'),
                new QueryExpression('SUM(glpi_tickettasks.actiontime) AS total_time'),
            ],
            'FROM'   => 'glpi_tickettasks',
            'INNER JOIN' => [
                'glpi_tickets' => [
                    'ON' => [
                        'glpi_tickettasks' => 'tickets_id',
                        'glpi_tickets' => 'id',
                    ],
                ],
            ],
            'LEFT JOIN' => [
                'glpi_entities' => [
                    'ON' => [
                        'glpi_entities' => 'id',
                        'glpi_tickets' => 'entities_id',
                    ],
                ],
            ],
            'WHERE'  => $where,
            'GROUPBY' => ['glpi_tickets.entities_id'],
            'ORDER'  => ['task_count DESC'],
            'LIMIT'  => $limit,
        ]);

        $data = [];
        foreach ($result as $row) {
            $data[] = [
                'id'               => (int)($row['id'] ?? 0),
                'name'             => $row['completename'] ?? $row['name'] ?? __('Root entity'),
                'task_count'       => (int)$row['task_count'],
                'total_time'       => (int)$row['total_time'],
                'total_time_hours' => round((int)$row['total_time'] / 3600, 1),
            ];
        }

        return $data;
    }

    /**
     * Get tasks by ticket (tickets with most tasks)
     *
     * @param array $entities Entity IDs
     * @param int $period Period type
     * @param int $limit Max results
     * @return array
     */
    public function getTasksByTicketReport(array $entities, int $period = 0, int $limit = 30, ?string $startDate = null, ?string $endDate = null): array
    {
        global $DB;

        [$dateStart, $dateEnd] = $this->getPeriodDates($period, $startDate, $endDate);

        $where = ['glpi_tickets.is_deleted' => 0];
        if (!empty($entities)) {
            $where['glpi_tickets.entities_id'] = $entities;
        }
        if ($dateStart !== null) {
            $where[] = ['glpi_tickettasks.date' => ['>=', $dateStart]];
            $where[] = ['glpi_tickettasks.date' => ['<=', $dateEnd]];
        }

        $result = $DB->request([
            'SELECT' => [
                'glpi_tickets.id',
                'glpi_tickets.name AS ticket_name',
                new QueryExpression('COUNT(glpi_tickettasks.id) AS task_count'),
                new QueryExpression('SUM(glpi_tickettasks.actiontime) AS total_time'),
            ],
            'FROM'   => 'glpi_tickettasks',
            'INNER JOIN' => [
                'glpi_tickets' => [
                    'ON' => [
                        'glpi_tickettasks' => 'tickets_id',
                        'glpi_tickets' => 'id',
                    ],
                ],
            ],
            'WHERE'  => $where,
            'GROUPBY' => ['glpi_tickettasks.tickets_id'],
            'ORDER'  => ['task_count DESC'],
            'LIMIT'  => $limit,
        ]);

        $data = [];
        foreach ($result as $row) {
            $data[] = [
                'id'               => (int)$row['id'],
                'name'             => $row['ticket_name'] ?? __('Unknown'),
                'task_count'       => (int)$row['task_count'],
                'total_time'       => (int)$row['total_time'],
                'total_time_hours' => round((int)$row['total_time'] / 3600, 1),
            ];
        }

        return $data;
    }

    /**
     * Get comprehensive asset report for a specific itemtype
     *
     * @param string $itemtype Asset type (Computer, Monitor, Printer, etc.)
     * @param array $entities Entity IDs
     * @param int $limit Max results for lists
     * @return array
     */
    public function getAssetReportByItemtype(
        string $itemtype,
        array $entities,
        int $limit = 20,
        int $period = 0,
        ?string $startDate = null,
        ?string $endDate = null
    ): array {
        global $DB;

        // Validate and sanitize itemtype
        $validTypes = [
            'Computer' => 'glpi_computers',
            'Monitor' => 'glpi_monitors',
            'Printer' => 'glpi_printers',
            'NetworkEquipment' => 'glpi_networkequipments',
            'Phone' => 'glpi_phones',
            'Peripheral' => 'glpi_peripherals',
            'Software' => 'glpi_softwares',
        ];

        if (!isset($validTypes[$itemtype])) {
            return ['error' => 'Invalid itemtype'];
        }

        $table = $validTypes[$itemtype];
        $typeTable = $table . 'types';
        $modelTable = $table . 'models';

        // Qualify column names to avoid ambiguity across joins
        $where = $this->buildAssetBaseWhere($entities, $table, $period, $startDate, $endDate);

        $data = [
            'total' => 0,
            'in_use' => 0,
            'in_stock' => 0,
            'with_tickets' => 0,
            'by_manufacturer' => [],
            'by_status' => [],
            'by_location' => [],
            'by_entity' => [],
            'by_model' => [],
            'recent_items' => [],
        ];

        // Total count
        $result = $DB->request([
            'COUNT' => 'total',
            'FROM' => $table,
            'WHERE' => $where,
        ]);
        $row = $this->getFirstRow($result);
        $data['total'] = (int)($row['total'] ?? 0);

        // Count by status (in use = states_id with is_visible_computer or similar)
        $stateResult = $DB->request([
            'SELECT' => [
                'glpi_states.name AS label',
                new QueryExpression('COUNT(*) AS count'),
            ],
            'FROM' => $table,
            'LEFT JOIN' => [
                'glpi_states' => [
                    'ON' => [
                        $table => 'states_id',
                        'glpi_states' => 'id',
                    ],
                ],
            ],
            'WHERE' => $where,
            'GROUPBY' => ["$table.states_id"],
            'ORDER' => ['count DESC'],
        ]);

        foreach ($stateResult as $row) {
            $stateName = $row['label'] ?? __('Not defined');
            $data['by_status'][] = [
                'label' => $stateName,
                'count' => (int)$row['count'],
            ];
        }

        // Approximate "in use" vs "in stock" from common status patterns
        $inUseStates = $DB->request([
            'COUNT' => 'total',
            'FROM' => $table,
            'LEFT JOIN' => [
                'glpi_states' => [
                    'ON' => [
                        $table => 'states_id',
                        'glpi_states' => 'id',
                    ],
                ],
            ],
            'WHERE' => array_merge($where, [
                'OR' => [
                    ['glpi_states.name' => ['LIKE', '%use%']],
                    ['glpi_states.name' => ['LIKE', '%production%']],
                    ['glpi_states.name' => ['LIKE', '%actif%']],
                    ['glpi_states.name' => ['LIKE', '%active%']],
                ],
            ]),
        ]);
        $inUseRow = $this->getFirstRow($inUseStates);
        $data['in_use'] = (int)($inUseRow['total'] ?? 0);

        $inStockStates = $DB->request([
            'COUNT' => 'total',
            'FROM' => $table,
            'LEFT JOIN' => [
                'glpi_states' => [
                    'ON' => [
                        $table => 'states_id',
                        'glpi_states' => 'id',
                    ],
                ],
            ],
            'WHERE' => array_merge($where, [
                'OR' => [
                    ['glpi_states.name' => ['LIKE', '%stock%']],
                    ['glpi_states.name' => ['LIKE', '%spare%']],
                    ['glpi_states.name' => ['LIKE', '%reserve%']],
                ],
            ]),
        ]);
        $inStockRow = $this->getFirstRow($inStockStates);
        $data['in_stock'] = (int)($inStockRow['total'] ?? 0);

        // With open tickets
        $ticketsResult = $DB->request([
            'SELECT' => [
                new QueryExpression("COUNT(DISTINCT $table.id) AS total"),
            ],
            'FROM' => $table,
            'INNER JOIN' => [
                'glpi_items_tickets' => [
                    'ON' => [
                        'glpi_items_tickets' => 'items_id',
                        $table => 'id',
                        ['AND' => ['glpi_items_tickets.itemtype' => $itemtype]],
                    ],
                ],
                'glpi_tickets' => [
                    'ON' => [
                        'glpi_items_tickets' => 'tickets_id',
                        'glpi_tickets' => 'id',
                    ],
                ],
            ],
            'WHERE' => array_merge($where, [
                'glpi_tickets.is_deleted' => 0,
                'glpi_tickets.status' => ['<', 5], // Not closed
            ]),
        ]);
        $ticketsRow = $this->getFirstRow($ticketsResult);
        $data['with_tickets'] = (int)($ticketsRow['total'] ?? 0);

        // By manufacturer
        $manufacturerResult = $DB->request([
            'SELECT' => [
                'glpi_manufacturers.name AS label',
                new QueryExpression('COUNT(*) AS count'),
            ],
            'FROM' => $table,
            'LEFT JOIN' => [
                'glpi_manufacturers' => [
                    'ON' => [
                        $table => 'manufacturers_id',
                        'glpi_manufacturers' => 'id',
                    ],
                ],
            ],
            'WHERE' => $where,
            'GROUPBY' => ["$table.manufacturers_id"],
            'ORDER' => ['count DESC'],
            'LIMIT' => $limit,
        ]);

        foreach ($manufacturerResult as $row) {
            $data['by_manufacturer'][] = [
                'label' => $row['label'] ?? __('Not defined'),
                'count' => (int)$row['count'],
            ];
        }

        // By location
        $locationResult = $DB->request([
            'SELECT' => [
                'glpi_locations.completename AS label',
                new QueryExpression('COUNT(*) AS count'),
            ],
            'FROM' => $table,
            'LEFT JOIN' => [
                'glpi_locations' => [
                    'ON' => [
                        $table => 'locations_id',
                        'glpi_locations' => 'id',
                    ],
                ],
            ],
            'WHERE' => $where,
            'GROUPBY' => ["$table.locations_id"],
            'ORDER' => ['count DESC'],
            'LIMIT' => $limit,
        ]);

        foreach ($locationResult as $row) {
            $data['by_location'][] = [
                'label' => $row['label'] ?? __('Not defined'),
                'count' => (int)$row['count'],
            ];
        }

        // By entity
        $entityResult = $DB->request([
            'SELECT' => [
                'glpi_entities.completename AS label',
                new QueryExpression('COUNT(*) AS count'),
            ],
            'FROM' => $table,
            'LEFT JOIN' => [
                'glpi_entities' => [
                    'ON' => [
                        $table => 'entities_id',
                        'glpi_entities' => 'id',
                    ],
                ],
            ],
            'WHERE' => $where,
            'GROUPBY' => ["$table.entities_id"],
            'ORDER' => ['count DESC'],
            'LIMIT' => $limit,
        ]);

        foreach ($entityResult as $row) {
            $data['by_entity'][] = [
                'label' => $row['label'] ?? __('Root entity'),
                'count' => (int)$row['count'],
            ];
        }

        // By model (if applicable)
        if ($DB->tableExists($modelTable)) {
            $modelResult = $DB->request([
                'SELECT' => [
                    "$modelTable.name AS label",
                    new QueryExpression('COUNT(*) AS count'),
                ],
                'FROM' => $table,
                'LEFT JOIN' => [
                    $modelTable => [
                        'ON' => [
                            $table => str_replace('glpi_', '', $modelTable) . '_id',
                            $modelTable => 'id',
                        ],
                    ],
                ],
                'WHERE' => $where,
                'GROUPBY' => ["$table." . str_replace('glpi_', '', $modelTable) . '_id'],
                'ORDER' => ['count DESC'],
                'LIMIT' => $limit,
            ]);

            foreach ($modelResult as $row) {
                $data['by_model'][] = [
                    'label' => $row['label'] ?? __('Not defined'),
                    'count' => (int)$row['count'],
                ];
            }
        }

        // Computer-specific: by OS
        if ($itemtype === 'Computer') {
            $osResult = $DB->request([
                'SELECT' => [
                    'glpi_operatingsystems.name AS label',
                    new QueryExpression('COUNT(*) AS count'),
                ],
                'FROM' => 'glpi_computers',
                'LEFT JOIN' => [
                    'glpi_items_operatingsystems' => [
                        'ON' => [
                            'glpi_items_operatingsystems' => 'items_id',
                            'glpi_computers' => 'id',
                            ['AND' => ['glpi_items_operatingsystems.itemtype' => 'Computer']],
                        ],
                    ],
                    'glpi_operatingsystems' => [
                        'ON' => [
                            'glpi_items_operatingsystems' => 'operatingsystems_id',
                            'glpi_operatingsystems' => 'id',
                        ],
                    ],
                ],
                'WHERE' => $where,
                'GROUPBY' => ['glpi_items_operatingsystems.operatingsystems_id'],
                'ORDER' => ['count DESC'],
                'LIMIT' => $limit,
            ]);

            $data['by_os'] = [];
            foreach ($osResult as $row) {
                $data['by_os'][] = [
                    'label' => $row['label'] ?? __('Not defined'),
                    'count' => (int)$row['count'],
                ];
            }

            // By type
            $typeResult = $DB->request([
                'SELECT' => [
                    'glpi_computertypes.name AS label',
                    new QueryExpression('COUNT(*) AS count'),
                ],
                'FROM' => 'glpi_computers',
                'LEFT JOIN' => [
                    'glpi_computertypes' => [
                        'ON' => [
                            'glpi_computers' => 'computertypes_id',
                            'glpi_computertypes' => 'id',
                        ],
                    ],
                ],
                'WHERE' => $where,
                'GROUPBY' => ['glpi_computers.computertypes_id'],
                'ORDER' => ['count DESC'],
                'LIMIT' => $limit,
            ]);

            $data['by_type'] = [];
            foreach ($typeResult as $row) {
                $data['by_type'][] = [
                    'label' => $row['label'] ?? __('Not defined'),
                    'count' => (int)$row['count'],
                ];
            }
        }

        // Software-specific: by category
        if ($itemtype === 'Software') {
            $catResult = $DB->request([
                'SELECT' => [
                    'glpi_softwarecategories.name AS label',
                    new QueryExpression('COUNT(*) AS count'),
                ],
                'FROM' => 'glpi_softwares',
                'LEFT JOIN' => [
                    'glpi_softwarecategories' => [
                        'ON' => [
                            'glpi_softwares' => 'softwarecategories_id',
                            'glpi_softwarecategories' => 'id',
                        ],
                    ],
                ],
                'WHERE' => $where,
                'GROUPBY' => ['glpi_softwares.softwarecategories_id'],
                'ORDER' => ['count DESC'],
                'LIMIT' => $limit,
            ]);

            $data['by_category'] = [];
            foreach ($catResult as $row) {
                $data['by_category'][] = [
                    'label' => $row['label'] ?? __('Not defined'),
                    'count' => (int)$row['count'],
                ];
            }
        }

        // Recent items
        $recentResult = $DB->request([
            'SELECT' => [
                "$table.id",
                "$table.name",
                "$table.serial",
                'glpi_locations.completename AS location',
                'glpi_states.name AS status',
                "$table.date_creation",
            ],
            'FROM' => $table,
            'LEFT JOIN' => [
                'glpi_locations' => [
                    'ON' => [
                        $table => 'locations_id',
                        'glpi_locations' => 'id',
                    ],
                ],
                'glpi_states' => [
                    'ON' => [
                        $table => 'states_id',
                        'glpi_states' => 'id',
                    ],
                ],
            ],
            'WHERE' => $where,
            'ORDER' => ["$table.date_creation DESC"],
            'LIMIT' => 10,
        ]);

        foreach ($recentResult as $row) {
            $data['recent_items'][] = [
                'id' => (int)$row['id'],
                'name' => $row['name'] ?? '',
                'serial' => $row['serial'] ?? '',
                'location' => $row['location'] ?? __('Not defined'),
                'status' => $row['status'] ?? __('Not defined'),
                'date_creation' => $row['date_creation'] ?? '',
            ];
        }

        return $data;
    }
}
