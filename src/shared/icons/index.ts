/**
 * Shared Icons Module
 * Exports all icon-related types, configs, and utilities
 */

// Types
export { IconType } from "./icon.types";

// Config
export {
    ICON_COLORS,
    ICON_MAP,
    ICON_CONFIG,
    ICON_GROUPS,
    type IconConfig,
    type IconColorKey,
    type IconColorValue,
    type IconGroupId,
} from "./icon.config";

// Utilities
export {
    getActiveIcons,
    getIconOptions,
    getIconsGrouped,
    getAllIconKeywords,
    getAllIconLabel,
    findBestIconMatch,
    getIconDefaultColor,
    getIconComponent,
    getIconConfig,
    getIconByType,
    renderIconWithDefaultColor,
    type IconOption,
    type IconGroup,
} from "./icon.utils";
