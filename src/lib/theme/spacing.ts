/**
 * Design System - Spacing Tokens
 * Base spacing scale and semantic spacing values
 */

export const spacing = {
    0: "0px",
    1: "4px", // 0.5 * 8
    2: "8px", // 1 * 8
    3: "12px", // 1.5 * 8
    4: "16px", // 2 * 8
    5: "20px", // 2.5 * 8
    6: "24px", // 3 * 8
    7: "28px", // 3.5 * 8
    8: "32px", // 4 * 8
    9: "36px", // 4.5 * 8
    10: "40px", // 5 * 8
    12: "48px", // 6 * 8
    16: "64px", // 8 * 8
    20: "80px", // 10 * 8
    24: "96px", // 12 * 8
    32: "128px", // 16 * 8
    40: "160px", // 20 * 8
    48: "192px", // 24 * 8
    56: "224px", // 28 * 8
    64: "256px", // 32 * 8
} as const;

// Semantic spacing (common use cases)
export const semanticSpacing = {
    // Component spacing
    componentPadding: spacing[6], // 24px
    componentGap: spacing[4], // 16px

    // Container spacing
    containerPadding: {
        mobile: spacing[4], // 16px
        tablet: spacing[6], // 24px
        desktop: spacing[8], // 32px
    },

    // Section spacing
    sectionMargin: {
        small: spacing[8], // 32px
        medium: spacing[12], // 48px
        large: spacing[16], // 64px
    },

    // Element spacing
    elementGap: {
        tiny: spacing[1], // 4px
        small: spacing[2], // 8px
        medium: spacing[4], // 16px
        large: spacing[6], // 24px
    },
} as const;
