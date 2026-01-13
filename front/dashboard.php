<?php

/**
 * Dashboard NG - Main Dashboard Page
 */

include('../../../inc/includes.php');

use GlpiPlugin\Dashboardng\Pages\DashboardPage;

$page = new DashboardPage();
$page->handle();
