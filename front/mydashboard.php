<?php

/**
 * Dashboard NG - My Dashboard Page
 */

include('../../../inc/includes.php');

use GlpiPlugin\Dashboardng\Pages\MyDashboardPage;

$page = new MyDashboardPage();
$page->handle();
