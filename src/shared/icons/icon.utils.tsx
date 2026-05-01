/**
 * Icon Utility Functions
 * Helper functions for icon matching, retrieval, and rendering
 */

import React from "react";
import type { LucideIcon } from "lucide-react";
import { fuzzyMatchWithDiacritics } from "../utils/fuzzy-search.utils";
import { IconKey, IconOption } from "./icon.types";
import { ICON_MAP, ICON_CONFIG, ICON_COLORS, ICON_GROUPS, IconConfig, IconGroupId } from "./icon.config";


/**
 * Grouped icons structure for picker
 */
 interface IconGroup {
    id: IconGroupId;
    label: string;
    order: number;
    icons: IconOption[];
}

/**
 * Get all active icons for pickers
 */
function getActiveIcons(): Array<{ type: IconKey; Icon: LucideIcon; config: IconConfig }> {
    return Object.entries(ICON_CONFIG)
        .filter(([_, config]) => config.isActive)
        .map(([type, config]) => ({
            type: type as IconKey,
            Icon: ICON_MAP[type as IconKey],
            config,
        }));
}

/**
 * Get icon options for pickers (formatted for dropdowns)
 */
export function getIconOptions(): IconOption[] {
    return getActiveIcons().map(({ type, Icon, config }) => ({
        value: type,
        label: config.label,
        Icon,
        defaultColor: config.defaultColor,
        group: config.group,
    }));
}

/**
 * Get icons grouped by category for picker display
 */
export function getIconsGrouped(): IconGroup[] {
    const iconOptions = getIconOptions();

    // Create groups map
    const groupsMap = new Map<IconGroupId, IconOption[]>();

    // Initialize groups
    for (const group of Object.values(ICON_GROUPS)) {
        groupsMap.set(group.id, []);
    }

    // Assign icons to groups
    for (const icon of iconOptions) {
        const group = groupsMap.get(icon.group);
        if (group) {
            group.push(icon);
        }
    }

    // Convert to array and sort by order
    const groups: IconGroup[] = [];
    for (const groupDef of Object.values(ICON_GROUPS)) {
        const icons = groupsMap.get(groupDef.id) || [];
        if (icons.length > 0) {
            // Sort icons alphabetically (A-Z) within each group
            const sortedIcons = [...icons].sort((a, b) =>
                a.label.localeCompare(b.label)
            );
            groups.push({
                id: groupDef.id,
                label: groupDef.label,
                order: groupDef.order,
                icons: sortedIcons,
            });
        }
    }

    return groups.sort((a, b) => a.order - b.order);
}

/**
 * Get all keywords from active icons for autocomplete suggestions
 */
export function getAllIconKeywords(): Array<{ id: string; label: string; iconType: IconKey }> {
    const keywords: Array<{ id: string; label: string; iconType: IconKey }> = [];

    for (const [iconType, config] of Object.entries(ICON_CONFIG)) {
        if (!config.isActive) continue;

        for (const keyword of config.keywords) {
            // Capitalize first letter for display
            const label = keyword.charAt(0).toUpperCase() + keyword.slice(1);
            keywords.push({
                id: `${iconType}-${keyword}`,
                label,
                iconType: iconType as IconKey,
            });
        }
    }

    // Sort alphabetically
    return keywords.sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Get all active icon labels for autocomplete
 */
export function getAllIconLabel(): Array<{
    id: IconKey;
    label: string;
    iconType: IconKey;
}> {
    return (Object.entries(ICON_CONFIG) as [IconKey, IconConfig][])
        .filter(([_, config]) => config.isActive)
        .map(([iconType, config]) => ({
            id: iconType,
            label: config.label,
            iconType,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Find the best matching icon based on text (folder name, note name, etc.)
 * Returns null if no good match found (will use default icon)
 * Only considers active icons
 * Uses fuzzyMatchWithDiacritics for Vietnamese diacritics support
 */
export function findBestIconMatch(text: string): IconKey | null {
    if (!text || text.trim().length < 2) return null;

    const query = text.trim();
    let bestMatch: IconKey | null = null;
    let bestScore = 0;

    for (const [iconType, config] of Object.entries(ICON_CONFIG)) {
        // Skip inactive icons and special icons (FOLDER, BIN)
        if (!config.isActive || iconType === "FOLDER" || iconType === "BIN") continue;

        for (const keyword of config.keywords) {
            // Use fuzzyMatchWithDiacritics for better Vietnamese support
            const result = fuzzyMatchWithDiacritics(keyword, [query]);
            if (result.match && result.score > bestScore) {
                bestScore = result.score;
                bestMatch = iconType as IconKey;
            }
        }
    }

    return bestMatch;
}

/**
 * Get the default color for an icon type
 * Returns grey color if icon type not found
 */
export function getIconDefaultColor(iconType: IconKey | null): string {
    if (!iconType) return ICON_COLORS.GREY;
    return ICON_CONFIG[iconType]?.defaultColor ?? ICON_COLORS.GREY;
}

/**
 * Get the icon component for a given type
 */
export function getIconComponent(iconType: IconKey): LucideIcon | null {
    return ICON_MAP[iconType] ?? null;
}

/**
 * Get icon config for a given type
 */
export function getIconConfig(iconType: IconKey): IconConfig | null {
    return ICON_CONFIG[iconType] ?? null;
}

type GetIconParams = {
    type: IconKey;
    color?: string;
    size?: number;
    className?: string;
};

/**
 * Get a rendered icon element by type
 */
export function getIconByType({ type, color, size = 20, className }: GetIconParams) {
    const Icon = ICON_MAP[type];
    if (!Icon) return null;

    // Use icon's default color if no color specified
    const iconColor = color ?? getIconDefaultColor(type);

    return <Icon size={size} color={iconColor} className={className} />;
}

/**
 * Render an icon with its default color
 */
export function renderIconWithDefaultColor(
    iconType: IconKey | null,
    size: number = 18,
    className?: string
) {
    if (!iconType) {
        const FolderIcon = ICON_MAP.FOLDER;
        return <FolderIcon size={size} color={ICON_COLORS.GREY} className={className} />;
    }

    const Icon = ICON_MAP[iconType];
    const color = getIconDefaultColor(iconType);

    return <Icon size={size} color={color} className={className} />;
}
