<?php

include("../../inc/includes.php");
include("./vendor/autoload.php");

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

if (!(new Plugin())->isActivated('dashboardng')) {
    http_response_code(404);
    echo json_encode(['error' => 'Plugin not activated']);
    exit;
}

$requestUri = $_SERVER['REQUEST_URI'];
$verb = $_SERVER['REQUEST_METHOD'];

$basePath = preg_replace('/\/api\.php.*$/', '', $requestUri);
$apiPath = preg_replace('/^.*\/api\.php/', '', $requestUri);

if (false !== $pos = strpos($apiPath, '?')) {
    $apiPath = substr($apiPath, 0, $pos);
}

$apiPath = '/' . trim(rawurldecode($apiPath), '/');
if ($apiPath === '/') {
    $apiPath = '/kpis';
}

try {
    $router = new GlpiPlugin\Dashboardng\ApiRouter();
    $router->handleRequest($verb, $apiPath);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal Server Error'
    ]);
}
