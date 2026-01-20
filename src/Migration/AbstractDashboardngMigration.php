<?php

namespace GlpiPlugin\Dashboardng\Migration;

abstract class AbstractDashboardngMigration
{
    /**
     * Monotonic schema version string, e.g. "0001".
     */
    public const VERSION = '0000';

    abstract public function upgrade(\Migration $migration): void;
}
