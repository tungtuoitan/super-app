/**
 * Design System - Border Radius Tokens
 * Border radius scale for consistent rounded corners
 */

export const borderRadius = {
    none: "0px",
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "24px",
    full: "9999px", // Fully rounded
} as const;

// Semantic border radius
export const semanticBorderRadius = {
    button: borderRadius.md,
    card: borderRadius.lg,
    input: borderRadius.md,
    dialog: borderRadius.xl,
    chip: borderRadius.full,
    avatar: borderRadius.full,
} as const;
