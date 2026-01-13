<?php

/**
 * Dashboard NG - Tasks Page
 */

include('../../../inc/includes.php');

use GlpiPlugin\Dashboardng\Pages\TasksPage;

$page = new TasksPage();
$page->handle();
