<?php

namespace GlpiPlugin\Dashboardng\DataSources;

/**
 * Date Gap Filler - Fills missing dates in date-grouped results with zeros
 */
class DateGapFiller
{
    /**
     * Fill gaps in date-grouped results with zero values
     *
     * @param array $rows Results from database query
     * @param array|null $dateRange Date range configuration ['start', 'end', 'interval']
     * @param array $dateIntervalConfig Field and interval configuration
     * @return array Rows with filled gaps
     */
    public function fillDateGaps(array $rows, ?array $dateRange, array $dateIntervalConfig): array
    {
        $interval = $dateRange['interval'] ?? $dateIntervalConfig['interval'];
        $fieldId = $dateIntervalConfig['field'];
        $alias = 'group_' . $fieldId;
        $resolvedRange = $this->resolveDateRange($rows, $dateRange, $alias, $interval);
        $start = $resolvedRange['start'] ?? null;
        $end = $resolvedRange['end'] ?? null;

        if (!$start || !$end) {
            return $rows;
        }

        $allDates = $this->generateDateRange($start, $end, $interval);
        $dataByDate = $this->indexDataByDate($rows, $alias, $interval);

        return $this->mergeDataWithDates($allDates, $dataByDate, $alias, $interval);
    }

    private function resolveDateRange(array $rows, ?array $dateRange, string $alias, string $interval): ?array
    {
        $start = $dateRange['start'] ?? null;
        $end = $dateRange['end'] ?? null;

        if ($start && $end) {
            return [
                'start' => $start,
                'end' => $end,
                'interval' => $interval,
            ];
        }

        $inferredRange = $this->inferDateRangeFromRows($rows, $alias, $interval);
        if ($inferredRange === null) {
            return null;
        }

        return [
            'start' => $inferredRange['start'],
            'end' => $inferredRange['end'],
            'interval' => $interval,
        ];
    }

    private function inferDateRangeFromRows(array $rows, string $alias, string $interval): ?array
    {
        $dates = [];

        foreach ($rows as $row) {
            $dateKey = $row[$alias] ?? null;
            if (!$dateKey) {
                continue;
            }

            try {
                $date = new \DateTime($dateKey);
                $date = $this->alignStartDate($date, $interval);
                $dates[] = $date->format('Y-m-d');
            } catch (\Exception $e) {
                continue;
            }
        }

        if ($dates === []) {
            return null;
        }

        sort($dates);

        return [
            'start' => $dates[0],
            'end' => $dates[count($dates) - 1],
        ];
    }

    /**
     * Index data by normalized date key
     *
     * @param array $rows
     * @param string $alias Field alias in rows
     * @param string $interval Date interval for normalization
     * @return array
     */
    private function indexDataByDate(array $rows, string $alias, string $interval): array
    {
        $dataByDate = [];

        foreach ($rows as $row) {
            $dateKey = $row[$alias] ?? null;
            if ($dateKey) {
                $normalizedKey = $this->normalizeDateKey($dateKey, $interval);
                $dataByDate[$normalizedKey] = $row;
            }
        }

        return $dataByDate;
    }

    /**
     * Merge data with all expected dates, filling gaps with zeros
     *
     * @param array $allDates Array of all expected dates
     * @param array $dataByDate Indexed data by date
     * @param string $alias Field alias for date value
     * @param string $interval Date interval for normalization
     * @return array
     */
    private function mergeDataWithDates(array $allDates, array $dataByDate, string $alias, string $interval): array
    {
        $filledRows = [];

        foreach ($allDates as $date) {
            $normalizedDate = $this->normalizeDateKey($date, $interval);
            if (isset($dataByDate[$normalizedDate])) {
                $filledRows[] = $dataByDate[$normalizedDate];
            } else {
                $filledRows[] = [
                    $alias => $date,
                    'value' => 0,
                ];
            }
        }

        return $filledRows;
    }

    /**
     * Generate array of dates for a range at the specified interval
     *
     * @param string $start Start date
     * @param string $end End date
     * @param string $interval Interval: day, week, month, year
     * @return array
     */
    private function generateDateRange(string $start, string $end, string $interval): array
    {
        $dates = [];
        $current = new \DateTime($start);
        $endDate = new \DateTime($end);

        $current = $this->alignStartDate($current, $interval);
        $dateInterval = $this->getDateInterval($interval);

        while ($current <= $endDate) {
            $dates[] = $current->format('Y-m-d');
            $current->add($dateInterval);
        }

        return $dates;
    }

    /**
     * Align start date to interval boundary
     *
     * @param \DateTime $date
     * @param string $interval
     * @return \DateTime
     */
    private function alignStartDate(\DateTime $date, string $interval): \DateTime
    {
        return match ($interval) {
            'week' => $this->alignToWeekStart($date),
            'month' => $this->alignToMonthStart($date),
            'year' => $this->alignToYearStart($date),
            default => $date,
        };
    }

    /**
     * Align date to start of week (Monday)
     *
     * @param \DateTime $date
     * @return \DateTime
     */
    private function alignToWeekStart(\DateTime $date): \DateTime
    {
        $dayOfWeek = (int) $date->format('N') - 1;
        $date->modify("-$dayOfWeek days");
        return $date;
    }

    /**
     * Align date to start of month
     *
     * @param \DateTime $date
     * @return \DateTime
     */
    private function alignToMonthStart(\DateTime $date): \DateTime
    {
        $date->modify('first day of this month');
        return $date;
    }

    /**
     * Align date to start of year
     *
     * @param \DateTime $date
     * @return \DateTime
     */
    private function alignToYearStart(\DateTime $date): \DateTime
    {
        $date->modify('first day of January');
        return $date;
    }

    /**
     * Get DateInterval object for specified interval
     *
     * @param string $interval
     * @return \DateInterval
     */
    private function getDateInterval(string $interval): \DateInterval
    {
        return match ($interval) {
            'day' => new \DateInterval('P1D'),
            'week' => new \DateInterval('P1W'),
            'month' => new \DateInterval('P1M'),
            'year' => new \DateInterval('P1Y'),
            default => new \DateInterval('P1D'),
        };
    }

    /**
     * Normalize a date key to Y-m-d format for comparison
     *
     * @param string $dateKey
     * @param string $interval
     * @return string
     */
    private function normalizeDateKey(string $dateKey, string $interval): string
    {
        try {
            $date = new \DateTime($dateKey);
            return $date->format('Y-m-d');
        } catch (\Exception $e) {
            return $dateKey;
        }
    }
}
