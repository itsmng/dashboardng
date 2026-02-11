<?php

namespace GlpiPlugin\Dashboardng;

use FastRoute;
use FastRoute\Dispatcher;
use GlpiPlugin\Dashboardng\Handlers\GetConfig;
use GlpiPlugin\Dashboardng\Handlers\UpdateConfig;
use GlpiPlugin\Dashboardng\Handlers\GetReports;
use GlpiPlugin\Dashboardng\Handlers\ExportReport;
use GlpiPlugin\Dashboardng\Handlers\GetDataSources;
use GlpiPlugin\Dashboardng\Handlers\GetDataSourceFields;
use GlpiPlugin\Dashboardng\Handlers\ExecuteQuery;
use GlpiPlugin\Dashboardng\Handlers\ClearCache;
use GlpiPlugin\Dashboardng\Handlers\GetDashboards;
use GlpiPlugin\Dashboardng\Handlers\GetDashboardWidgets;
use GlpiPlugin\Dashboardng\Handlers\GetGlobalDashboardWidgets;
use GlpiPlugin\Dashboardng\Handlers\GetWidgetLibrary;
use GlpiPlugin\Dashboardng\Handlers\AddWidgetToDashboard;
use GlpiPlugin\Dashboardng\Handlers\RemoveWidgetFromDashboard;
use GlpiPlugin\Dashboardng\Handlers\UpdateWidgetPositions;
use GlpiPlugin\Dashboardng\Handlers\UpdateWidgetConfigOverride;
use GlpiPlugin\Dashboardng\Handlers\CreateWidget;
use GlpiPlugin\Dashboardng\Handlers\CreatePersonalDashboard;
use GlpiPlugin\Dashboardng\Handlers\CreateSharedDashboard;
use GlpiPlugin\Dashboardng\Handlers\SetDefaultDashboard;
use Session;

/**
 * API Router - FastRoute based routing for Dashboard NG API
 */
class ApiRouter
{
    private Dispatcher $dispatcher;
    private ?string $iptxt = null;
    private ?int $ipnum = null;

    public function __construct()
    {
        $this->dispatcher = FastRoute\simpleDispatcher(function (FastRoute\RouteCollector $r) {
            $r->addRoute('GET', '/config', function () {
                $handler = new GetConfig();
                echo json_encode($handler->handle());
            });

            $r->addRoute('POST', '/config', function () {
                $handler = new UpdateConfig();
                $input = json_decode(file_get_contents('php://input'), true) ?? [];
                echo json_encode($handler->handle($input));
            });

            $r->addRoute('GET', '/reports/export-bulk', function () {
                $format = $_GET['format'] ?? 'csv';
                $handler = new ExportReport();
                $handler->handleBulk($format, $_GET);
            });

            $r->addRoute('GET', '/reports/{type}', function ($type) {
                $handler = new GetReports();
                echo json_encode($handler->handle($type, $_GET));
            });

            $r->addRoute('GET', '/reports/{type}/export', function ($type) {
                $format = $_GET['format'] ?? 'csv';
                $handler = new ExportReport();
                $handler->handle($type, $format, $_GET);
            });

            $r->addRoute('GET', '/dashboards', function () {
                $handler = new GetDashboards();
                echo json_encode(($handler)($_GET));
            });

            $r->addRoute('GET', '/dashboards/widgets', function () {
                $handler = new GetDashboardWidgets();
                echo json_encode(($handler)($_GET));
            });

            $r->addRoute('GET', '/dashboards/global/widgets', function () {
                $handler = new GetGlobalDashboardWidgets();
                echo json_encode(($handler)());
            });

            $r->addRoute('GET', '/dashboards/{id:\d+}/widgets', function ($id) {
                $handler = new GetDashboardWidgets();
                echo json_encode(($handler)(['dashboard_id' => (int)$id]));
            });

            $r->addRoute('POST', '/dashboards/personal', function () {
                $handler = new CreatePersonalDashboard();
                $input = json_decode(file_get_contents('php://input'), true) ?? [];
                echo json_encode(($handler)($input));
            });

            $r->addRoute('POST', '/dashboards/shared', function () {
                $handler = new CreateSharedDashboard();
                $input = json_decode(file_get_contents('php://input'), true) ?? [];
                echo json_encode(($handler)($input));
            });

            $r->addRoute('POST', '/dashboards/default', function () {
                $handler = new SetDefaultDashboard();
                $input = json_decode(file_get_contents('php://input'), true) ?? [];
                echo json_encode(($handler)($input));
            });

            $r->addRoute('POST', '/dashboards/positions', function () {
                $handler = new UpdateWidgetPositions();
                $input = json_decode(file_get_contents('php://input'), true) ?? [];
                echo json_encode(($handler)($input));
            });

            $r->addRoute('POST', '/dashboards/{id:\d+}/positions', function ($id) {
                $handler = new UpdateWidgetPositions();
                $input = json_decode(file_get_contents('php://input'), true) ?? [];
                $input['dashboard_id'] = (int)$id;
                echo json_encode(($handler)($input));
            });

            $r->addRoute('GET', '/widgets/library', function () {
                $handler = new GetWidgetLibrary();
                echo json_encode(($handler)($_GET));
            });

            $r->addRoute('POST', '/dashboards/widgets', function () {
                $handler = new AddWidgetToDashboard();
                $input = json_decode(file_get_contents('php://input'), true) ?? [];
                echo json_encode(($handler)($input));
            });

            $r->addRoute('POST', '/dashboards/widgets/config', function () {
                $handler = new UpdateWidgetConfigOverride();
                $input = json_decode(file_get_contents('php://input'), true) ?? [];
                echo json_encode(($handler)($input));
            });

            $r->addRoute('DELETE', '/dashboards/widgets/{id:\d+}', function ($id) {
                $handler = new RemoveWidgetFromDashboard();
                echo json_encode(($handler)(['placement_id' => (int)$id] + $_GET));
            });

            $r->addRoute('POST', '/widgets/create', function () {
                $handler = new CreateWidget();
                $input = json_decode(file_get_contents('php://input'), true) ?? [];
                echo json_encode(($handler)($input));
            });

            $r->addRoute('GET', '/datasources', function () {
                $handler = new GetDataSources();
                echo json_encode($handler->handle($_GET));
            });

            $r->addRoute('GET', '/datasources/{itemtype}/fields', function ($itemtype) {
                $handler = new GetDataSourceFields();
                echo json_encode($handler->handle($itemtype, $_GET));
            });

            $r->addRoute('POST', '/query', function () {
                $handler = new ExecuteQuery();
                $input = json_decode(file_get_contents('php://input'), true) ?? [];
                echo json_encode($handler->handle($input));
            });

            $r->addRoute('DELETE', '/cache', function () {
                $handler = new ClearCache();
                $input = json_decode(file_get_contents('php://input'), true) ?? [];
                echo json_encode($handler->handle($input));
            });

            $r->addRoute('POST', '/cache/clear', function () {
                $handler = new ClearCache();
                $input = json_decode(file_get_contents('php://input'), true) ?? [];
                echo json_encode($handler->handle($input));
            });
        });
    }

    /**
     * Retrieve and validate session from token
     *
     * @return string|null Session token if valid
     */
    private function retrieveSession(): ?string
    {
        $headers = getallheaders();
        $sessionToken = $headers['Session-Token'] ?? null;

        // If not in headers, check cookies
        if (!$sessionToken) {
            foreach ($_COOKIE as $key => $value) {
                if (preg_match('/^glpi_[^_]+$/', $key)) {
                    $sessionToken = $value;
                    break;
                }
            }
        }

        if ($sessionToken) {
            if (session_id() !== '') {
                session_write_close();
            }

            session_id($sessionToken);
            session_start();

            if (isset($_SESSION['glpiID']) && $_SESSION['glpiID'] > 0) {
                return $sessionToken;
            }

            session_destroy();
            return null;
        }

        return null;
    }

    /**
     * Initialize API and validate access
     *
     * @return array|null Error array if initialization fails, null on success
     */
    private function initApi(): ?array
    {
        global $CFG_GLPI;

        if (!isset($_SESSION['glpiID']) || $_SESSION['glpiID'] <= 0) {
            return ['error' => 'User not authenticated'];
        }

        if (!isset($_SESSION['glpiactiveprofile']) || empty($_SESSION['glpiactiveprofile'])) {
            return ['error' => 'No active profile found'];
        }

        if (!Session::haveRight('plugin_dashboardng_access', READ)) {
            return ['error' => 'Unauthorized'];
        }

        ini_set('display_errors', 'Off');
        $_SESSION['MESSAGE_AFTER_REDIRECT'] = [];

        if (!($CFG_GLPI['enable_api'] ?? true)) {
            return ['error' => 'API disabled'];
        }

        $this->iptxt = \Toolbox::getRemoteIpAddress();
        $this->ipnum = strstr($this->iptxt, ':') === false ? ip2long($this->iptxt) : null;

        return null;
    }

    /**
     * Handle incoming API request
     *
     * @param string $httpMethod HTTP method (GET, POST, etc.)
     * @param string $uri Request URI
     * @return void
     */
    public function handleRequest(string $httpMethod, string $uri): void
    {
        if (isset(getallheaders()['Session-Token'])) {
            $sessionToken = $this->retrieveSession();
            if ($sessionToken === null) {
                http_response_code(401);
                echo json_encode(['error' => 'Unauthorized']);
                return;
            }
        }

        $apiInit = $this->initApi();
        if ($apiInit !== null) {
            http_response_code(403);
            echo json_encode($apiInit);
            return;
        }

        $routeInfo = $this->dispatcher->dispatch($httpMethod, $uri);

        switch ($routeInfo[0]) {
            case Dispatcher::NOT_FOUND:
                http_response_code(404);
                echo json_encode(['error' => 'Not Found']);
                break;

            case Dispatcher::METHOD_NOT_ALLOWED:
                http_response_code(405);
                echo json_encode(['error' => 'Method Not Allowed']);
                break;

            case Dispatcher::FOUND:
                $handler = $routeInfo[1];
                $vars = $routeInfo[2];
                
                if (is_callable($handler)) {
                    try {
                        call_user_func_array($handler, $vars);
                    } catch (\Exception $e) {
                        http_response_code(500);
                        echo json_encode(['error' => 'Internal Server Error']);
                    }
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'Internal Server Error']);
                }
                break;
        }
    }
}
