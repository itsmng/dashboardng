<?php

namespace GlpiPlugin\Dashboardng\Handlers;

use GlpiPlugin\Dashboardng\Cache\QueryCacheManager;
use Session;

/**
 * Handler for clearing dashboardng cache
 */
class ClearCache
{
    public function handle(?array $params = null): array
    {
        // Check permissions
        if (!Session::haveRight('config', UPDATE) && !Session::haveRight('plugin_dashboardng_config', UPDATE)) {
            return [
                'success' => false,
                'error' => 'Unauthorized: insufficient permissions to clear cache',
            ];
        }

        try {
            $cacheManager = new QueryCacheManager();

            if (isset($params['itemtype']) && !empty($params['itemtype'])) {
                // Clear cache for specific itemtype
                $itemtype = $params['itemtype'];
                $cacheManager->invalidateItemtype($itemtype);

                return [
                    'success' => true,
                    'message' => "Cache cleared for itemtype: $itemtype",
                ];
            } else {
                // Clear all plugin cache
                $cacheManager->clearPluginCache();

                return [
                    'success' => true,
                    'message' => 'All dashboardng cache cleared',
                ];
            }
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
