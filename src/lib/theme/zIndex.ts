/**
 * Design System - Z-Index Tokens
 * Z-index scale for layering elements
 */

export const zIndex = {
    hide: -1,
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
    notification: 1700,
} as const;
