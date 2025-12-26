/**
 * Design System - Theme Tokens
 * Exports all design tokens for use with shadcn/ui and Tailwind CSS
 */

// Export all design tokens
export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./shadows";
export * from "./borderRadius";
export * from "./breakpoints";
export * from "./zIndex";
export * from "./transitions";
export * from "./shadcn";

// Re-export commonly used tokens for convenience
import { colors } from "./colors";
import { spacing } from "./spacing";
import { borderRadius } from "./borderRadius";
import { shadows } from "./shadows";

export const tokens = {
    colors,
    spacing,
    borderRadius,
    shadows,
} as const;
