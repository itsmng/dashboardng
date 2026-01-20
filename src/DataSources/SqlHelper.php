<?php

namespace GlpiPlugin\Dashboardng\DataSources;

/**
 * SQL Helper - Provides SQL utility functions
 */
class SqlHelper
{
    /**
     * Get SQL expression for truncating a datetime field to the specified interval
     *
     * @param string $field Full field reference
     * @param string $interval Interval: day, week, month, year
     * @return string SQL expression
     */
    public static function getDateTruncationSQL(string $field, string $interval): string
    {
        return match ($interval) {
            'day' => "DATE($field)",
            'week' => "DATE(DATE_SUB($field, INTERVAL WEEKDAY($field) DAY))",
            'month' => "DATE_FORMAT($field, '%Y-%m-01')",
            'year' => "DATE_FORMAT($field, '%Y-01-01')",
            default => "DATE($field)",
        };
    }
}
