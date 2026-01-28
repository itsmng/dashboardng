<?php

namespace GlpiPlugin\Dashboardng\Cache;

use Toolbox;

/**
 * Query Cache Manager - Centralized cache management for dashboardng queries
 */
class QueryCacheManager
{
    const PREFIX = 'dashboardng:';
    const TTL_DEFAULT = 300;      // 5 minutes
    const TTL_LONG = 900;         // 15 minutes
    const TTL_SHORT = 60;         // 1 minute

    private bool $enabled;

    public function __construct(?array $config = null)
    {
        $this->enabled = $config['cache_enabled'] ?? true;
    }

    /**
     * Generate a cache key from query configuration
     *
     * @param array $queryConfig Query configuration
     * @return string Cache key
     */
    public function getQueryCacheKey(array $queryConfig): string
    {
        $normalized = $this->normalizeQueryConfig($queryConfig);

        $entities = $_SESSION['glpiactiveentities'] ?? [];
        $isRecursive = $_SESSION['glpisettings']['recursive'] ?? false;
        $userId = $_SESSION['glpiID'] ?? 0;
        $profileId = $_SESSION['glpiactiveprofile']['id'] ?? 0;

        // Sort entities for consistent cache keys
        sort($entities);
        $entityKey = implode(',', $entities);
        $recursiveFlag = $isRecursive ? 'r' : '';

        $entityContext = ":entity={$entityKey}({$recursiveFlag}):user={$userId}:profile={$profileId}";

        return self::PREFIX . 'query:' . sha1(serialize($normalized)) . $entityContext;
    }

    /**
     * Generate a cache key for search options
     *
     * @param string $itemtype Item type
     * @return string Cache key
     */
    public function getSearchOptionsCacheKey(string $itemtype): string
    {
        return self::PREFIX . 'searchopts:' . $itemtype;
    }

    /**
     * Generate a cache key for field display labels
     *
     * @param string $itemtype Item type
     * @param string $fieldName Field name
     * @param string $value Field value
     * @return string Cache key
     */
    public function getFieldLabelCacheKey(string $itemtype, string $fieldName, string $value): string
    {
        return self::PREFIX . 'fieldlabel:' . $itemtype . ':' . $fieldName . ':' . md5($value);
    }

    /**
     * Get cached value
     *
     * @param string $key Cache key
     * @return mixed|null Cached value or null if not found
     */
    public function get(string $key): mixed
    {
        if (!$this->enabled || !Toolbox::useCache()) {
            return null;
        }

        global $GLPI_CACHE;

        if ($GLPI_CACHE->has($key)) {
            return $GLPI_CACHE->get($key);
        }

        return null;
    }

    /**
     * Set a cached value with TTL
     *
     * @param string $key Cache key
     * @param mixed $value Value to cache
     * @param int $ttl Time to live in seconds
     * @return bool Success status
     */
    public function set(string $key, mixed $value, int $ttl = self::TTL_DEFAULT): bool
    {
        if (!$this->enabled || !Toolbox::useCache()) {
            return false;
        }

        global $GLPI_CACHE;

        return $GLPI_CACHE->set($key, $value, $ttl);
    }

    /**
     * Delete a cached value
     *
     * @param string $key Cache key
     * @return bool Success status
     */
    public function delete(string $key): bool
    {
        if (!$this->enabled || !Toolbox::useCache()) {
            return false;
        }

        global $GLPI_CACHE;

        return $GLPI_CACHE->delete($key);
    }

    /**
     * Clear all dashboardng plugin cache entries
     *
     * @return void
     */
    public function clearPluginCache(): void
    {
        if (!$this->enabled || !Toolbox::useCache()) {
            return;
        }

        global $GLPI_CACHE;

        $allKeys = $GLPI_CACHE->getAllKnownCacheKeys() ?? [];

        foreach ($allKeys as $key) {
            if (str_starts_with($key, self::PREFIX)) {
                $GLPI_CACHE->delete($key);
            }
        }
    }

    /**
     * Invalidate cache for a specific itemtype
     *
     * @param string $itemtype Item type
     * @return void
     */
    public function invalidateItemtype(string $itemtype): void
    {
        if (!$this->enabled || !Toolbox::useCache()) {
            return;
        }

        global $GLPI_CACHE;

        $allKeys = $GLPI_CACHE->getAllKnownCacheKeys() ?? [];

        foreach ($allKeys as $key) {
            if (str_starts_with($key, self::PREFIX) && str_contains($key, $itemtype)) {
                $GLPI_CACHE->delete($key);
            }
        }
    }

    /**
     * Check if caching is enabled
     *
     * @return bool
     */
    public function isEnabled(): bool
    {
        return $this->enabled && Toolbox::useCache();
    }

    /**
     * Normalize query configuration for consistent cache keys
     * Sorts arrays and handles numeric values
     *
     * @param array $config Query configuration
     * @return array Normalized configuration
     */
    private function normalizeQueryConfig(array $config): array
    {
        $normalized = [];

        $normalized['itemtype'] = $config['itemtype'] ?? null;

        if (isset($config['filters']) && is_array($config['filters'])) {
            $normalized['filters'] = $this->sortFilters($config['filters']);
        }

        if (isset($config['group_by'])) {
            $normalized['group_by'] = is_array($config['group_by'])
                ? $this->sortArray($config['group_by'])
                : $config['group_by'];
        }

        if (isset($config['aggregation'])) {
            $normalized['aggregation'] = is_array($config['aggregation'])
                ? $this->sortArray($config['aggregation'])
                : $config['aggregation'];
        }

        if (isset($config['order_by'])) {
            $normalized['order_by'] = is_array($config['order_by'])
                ? $this->sortArray($config['order_by'])
                : $config['order_by'];
        }

        $normalized['limit'] = $config['limit'] ?? 1000;
        $normalized['output_fields'] = isset($config['output_fields'])
            ? $this->sortArray($config['output_fields'])
            : [];

        if (isset($config['date_range'])) {
            $normalized['date_range'] = $this->sortArray($config['date_range']);
        }

        if (isset($config['series']) && is_array($config['series'])) {
            $normalized['series'] = array_map(
                fn($series) => $this->sortArray($series),
                $config['series']
            );
        }

        return $normalized;
    }

    /**
     * Sort filters array for consistent hashing
     *
     * @param array $filters Filters array
     * @return array Sorted filters
     */
    private function sortFilters(array $filters): array
    {
        $sorted = [];
        foreach ($filters as $filter) {
            if (is_array($filter)) {
                ksort($filter);
                $sorted[] = $filter;
            }
        }

        usort($sorted, function ($a, $b) {
            $fieldA = $a['field'] ?? '';
            $fieldB = $b['field'] ?? '';
            return strcmp($fieldA, $fieldB);
        });

        return $sorted;
    }

    /**
     * Sort array recursively
     *
     * @param mixed $value Value to sort
     * @return mixed Sorted value
     */
    private function sortArray(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }

        $sorted = [];
        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $sorted[$key] = $this->sortArray($item);
            } else {
                $sorted[$key] = $item;
            }
        }

        ksort($sorted);
        return $sorted;
    }
}
