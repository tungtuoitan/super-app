/**
 * Design System - Breakpoint Tokens
 * Responsive design breakpoints and media queries
 */

export const breakpoints = {
    xs: 0, // Extra small (phone)
    sm: 600, // Small (tablet)
    md: 900, // Medium (small laptop)
    lg: 1200, // Large (desktop)
    xl: 1536, // Extra large (large desktop)
} as const;

// Media queries
export const mediaQueries = {
    xs: `@media (min-width: ${breakpoints.xs}px)`,
    sm: `@media (min-width: ${breakpoints.sm}px)`,
    md: `@media (min-width: ${breakpoints.md}px)`,
    lg: `@media (min-width: ${breakpoints.lg}px)`,
    xl: `@media (min-width: ${breakpoints.xl}px)`,
} as const;

// Container max widths
export const containerMaxWidth = {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
} as const;
