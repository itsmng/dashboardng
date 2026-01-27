<?php

namespace GlpiPlugin\Dashboardng\Registry;

use CommonDBTM;
use Plugin;

/**
 * Itemtype Registry - Manages allowed itemtypes for data sources
 * 
 * Supports both default itemtypes and plugin extensions via hooks
 */
class ItemtypeRegistry
{
    /** @var array Default allowed itemtypes for security */
    private static array $defaultItemtypes = [
        'Ticket',
        'Problem',
        'Change',
        'Computer',
        'Monitor',
        'Printer',
        'Phone',
        'Peripheral',
        'Software',
        'SoftwareLicense',
        'SoftwareVersion',
        'NetworkEquipment',
        'Certificate',
        'Domain',
        'User',
        'Group',
        'Entity',
        'Location',
        'ITILCategory',
        'ITILFollowup',
        'TicketTask',
        'Project',
        'ProjectTask',
        'Contract',
        'Supplier',
        'Contact',
        'Document',
        'KnowbaseItem',
        'Cartridge',
        'Consumable',
        'Rack',
        'Enclosure',
        'PDU',
        'PassiveDCEquipment',
        'Cable',
    ];

    /** @var array|null Cached itemtypes with metadata */
    private static ?array $cache = null;

    /**
     * Get all available itemtypes with metadata
     * Includes default itemtypes plus any added via plugin hooks
     *
     * @return array Array of itemtype information
     */
    public static function getAvailableItemtypes(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }

        $allowedItemtypes = self::getAllowedItemtypes();
        $result = [];

        foreach ($allowedItemtypes as $itemtype) {
            if (!class_exists($itemtype)) {
                continue;
            }

            try {
                $item = new $itemtype();

                if (!$item->canView()) {
                    continue;
                }

                $result[] = [
                    'itemtype' => $itemtype,
                    'name' => $item->getTypeName(2),
                    'icon' => self::getItemtypeIcon($itemtype),
                    'category' => self::getItemtypeCategory($itemtype),
                    'table' => $item->getTable(),
                ];
            } catch (\Throwable $e) {
                continue;
            }
        }

        usort($result, fn($a, $b) => strcmp($a['category'] . $a['name'], $b['category'] . $b['name']));

        self::$cache = $result;
        return $result;
    }

    /**
     * Get list of allowed itemtype names
     * Combines defaults with plugin hook extensions
     *
     * @return array Array of itemtype class names
     */
    public static function getAllowedItemtypes(): array
    {
        $itemtypes = self::$defaultItemtypes;

        $pluginItemtypes = Plugin::doHookFunction('dashboardng_allowed_itemtypes', []);
        if (is_array($pluginItemtypes)) {
            foreach ($pluginItemtypes as $itemtype) {
                if (!in_array($itemtype, $itemtypes, true)) {
                    $itemtypes[] = $itemtype;
                }
            }
        }

        return $itemtypes;
    }

    /**
     * Check if an itemtype is allowed
     *
     * @param string $itemtype
     * @return bool
     */
    public static function isItemtypeAllowed(string $itemtype): bool
    {
        return in_array($itemtype, self::getAllowedItemtypes(), true);
    }

    /**
     * Add a custom itemtype to the registry
     * For runtime extensions (mainly for testing)
     *
     * @param string $itemtype
     * @return void
     */
    public static function addItemtype(string $itemtype): void
    {
        if (!in_array($itemtype, self::$defaultItemtypes, true)) {
            self::$defaultItemtypes[] = $itemtype;
        }
        self::clearCache();
    }

    /**
     * Clear the cached itemtypes list
     * Call after adding itemtypes or when plugins change
     *
     * @return void
     */
    public static function clearCache(): void
    {
        self::$cache = null;
    }

    /**
     * Get icon for itemtype
     *
     * @param string $itemtype
     * @return string
     */
    private static function getItemtypeIcon(string $itemtype): string
    {
        $icons = [
            'Ticket' => 'fa-ticket-alt',
            'Problem' => 'fa-exclamation-triangle',
            'Change' => 'fa-exchange-alt',
            'Computer' => 'fa-desktop',
            'Monitor' => 'fa-tv',
            'Printer' => 'fa-print',
            'Phone' => 'fa-phone',
            'Software' => 'fa-cube',
            'User' => 'fa-user',
            'Group' => 'fa-users',
            'Entity' => 'fa-building',
            'Location' => 'fa-map-marker-alt',
            'Project' => 'fa-project-diagram',
            'Contract' => 'fa-file-contract',
            'Document' => 'fa-file-alt',
            'KnowbaseItem' => 'fa-book',
            'NetworkEquipment' => 'fa-network-wired',
        ];

        return $icons[$itemtype] ?? 'fa-cube';
    }

    /**
     * Get category for itemtype
     *
     * @param string $itemtype
     * @return string
     */
    private static function getItemtypeCategory(string $itemtype): string
    {
        $categories = [
            'Ticket' => 'ITIL',
            'Problem' => 'ITIL',
            'Change' => 'ITIL',
            'ITILCategory' => 'ITIL',
            'ITILFollowup' => 'ITIL',
            'TicketTask' => 'ITIL',
            'Computer' => 'Assets',
            'Monitor' => 'Assets',
            'Printer' => 'Assets',
            'Phone' => 'Assets',
            'Peripheral' => 'Assets',
            'NetworkEquipment' => 'Assets',
            'Software' => 'Assets',
            'SoftwareLicense' => 'Assets',
            'Certificate' => 'Assets',
            'User' => 'Organization',
            'Group' => 'Organization',
            'Entity' => 'Organization',
            'Location' => 'Organization',
            'Project' => 'Projects',
            'ProjectTask' => 'Projects',
            'Contract' => 'Management',
            'Supplier' => 'Management',
            'Document' => 'Management',
            'KnowbaseItem' => 'Knowledge',
        ];

        return $categories[$itemtype] ?? 'Other';
    }
}
