<?php

namespace GlpiPlugin\Dashboardng\Pages;

use GlpiPlugin\Dashboardng\PluginDashboardngConfig;
use GlpiPlugin\Dashboardng\NavigationBar;
use Html;
use Plugin;
use Session;
use Twig;

abstract class AbstractPage
{
    protected string $pageTitle = '';
    protected array $data = [];
    protected string $requiredRight = 'plugin_dashboardng_access';
    protected int $rightLevel = READ;
    protected string $menuPage = 'dashboard';
    protected string $menuType = 'plugins';

    public function __construct()
    {
        $this->data = $this->initializeData();
    }

    public function handle(): void
    {
        $this->checkPluginActivated();
        $this->checkRights();
        $this->processForm();
        $this->renderHeader();
        $this->renderContent();
        $this->renderFooter();
    }

    protected function initializeData(): array
    {
        global $CFG_GLPI;

        return [
            'plugin_dir' => Plugin::getWebDir('dashboardng'),
            'root_doc' => $CFG_GLPI['root_doc'],
            'config' => PluginDashboardngConfig::getAll(),
            'entities' => $_SESSION['glpiactiveentities'] ?? [],
            'csrf_token' => Session::getNewCSRFToken(),
            'locale' => $_SESSION['glpilanguage'] ?? 'en_GB',
            'current_page' => $this->getCurrentPageIdentifier(),
            'userId' => Session::getLoginUserID(),
        ];
    }

    protected function processForm(): void
    {
    }

    protected function renderContent(): void
    {
        $template = $this->getTemplate();
        $root = Plugin::getPhpDir('dashboardng', false) . '/templates';

        renderTwigTemplate($template, $this->getTemplateContext(), $root);
    }

    abstract protected function getTemplate(): string;

    protected function getTemplateContext(): array
    {
        return array_merge($this->getCommonContext(), $this->data);
    }

    protected function getCommonContext(): array
    {
        return [
            'page_title' => $this->pageTitle,
            'navigation' => NavigationBar::getModel(),
            'translations' => $this->getTranslations(),
            'is_debug' => $_SESSION['glpi_use_mode'] === Session::DEBUG_MODE,
            'plugin_dir' => Plugin::getWebDir('dashboardng'),
            'script_paths' => $this->getScriptPaths(),
        ];
    }

    protected function getScriptPaths(): array
    {
        $pluginWebDir = Plugin::getWebDir('dashboardng');
        $pluginPhpDir = Plugin::getPhpDir('dashboardng', true);
        $distDir = $pluginPhpDir . '/js/dist';

        $entries = [
            'dashboard' => 'dashboard.js',
            'mydashboard' => 'mydashboard.js',
            'assetReports' => 'assetReports.js',
            'taskReports' => 'taskReports.js',
            'ticketReports' => 'ticketReports.js',
            'entitySelector' => 'entitySelector.js',
        ];

        $paths = [];
        foreach ($entries as $key => $file) {
            $bundlePath = $distDir . '/' . $file;
            if (is_file($bundlePath) && is_readable($bundlePath)) {
                $paths[$key] = $pluginWebDir . '/js/dist/' . $file;
            } else {
                $paths[$key] = $pluginWebDir . '/js/' . $file;
            }
        }

        return $paths;
    }

    protected function getTranslations(): array
    {
        return [
            'loading' => __('Loading...', 'dashboardng'),
            'error' => __('Error', 'dashboardng'),
            'refresh' => __('Refresh', 'dashboardng'),
        ];
    }

    protected function renderHeader(): void
    {
        Html::header(
            $this->pageTitle,
            $_SERVER['PHP_SELF'],
            $this->menuType,
            \GlpiPlugin\Dashboardng\DashboardMenu::class,
            $this->menuPage
        );
    }

    protected function renderFooter(): void
    {
        Html::footer();
    }

    protected function checkPluginActivated(): void
    {
        if (!(new Plugin())->isActivated('dashboardng')) {
            Html::displayNotFoundError();
            exit;
        }
    }

    protected function checkRights(): void
    {
        Session::checkRight($this->requiredRight, $this->rightLevel);
    }

    protected function getCurrentPageIdentifier(): string
    {
        return $this->menuPage;
    }

    protected function addData(string $key, $value): void
    {
        $this->data[$key] = $value;
    }

    protected function getData(string $key, $default = null)
    {
        return $this->data[$key] ?? $default;
    }
}
