<?php

/**
 * Dashboard NG - Tickets Page
 */

include('../../../inc/includes.php');

use GlpiPlugin\Dashboardng\Pages\TicketsPage;

$page = new TicketsPage();
$page->handle();
