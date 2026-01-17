/**
 * Icon Utils - Re-export from shared module
 * @deprecated Import from "@/shared/icons" instead
 */
export {
    // Types
    IconType,
    type IconConfig,
    type IconOption,
    type IconGroup,
    type IconColorKey,
    type IconColorValue,
    type IconGroupId,

    // Constants
    ICON_COLORS,
    ICON_MAP,
    ICON_CONFIG,
    ICON_GROUPS,

    // Functions
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
} from "@/shared/icons";
