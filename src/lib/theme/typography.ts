/**
 * Design System - Typography Tokens
 * Font families, sizes, weights, and typography scale
 */

export const fonts = {
    // Primary font (UI)
    primary: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',

    // Secondary font (Headings)
    secondary: '"Poppins", "Inter", "Roboto", sans-serif',

    // Monospace (Code)
    mono: '"Fira Code", "Consolas", "Monaco", monospace',
} as const;

// Font weights
export const fontWeights = {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
} as const;

export const typography = {
    // Display (Extra large headings)
    display1: {
        fontSize: "3.5rem", // 56px
        lineHeight: 1.2,
        fontWeight: fontWeights.bold,
        letterSpacing: "-0.02em",
    },
    display2: {
        fontSize: "3rem", // 48px
        lineHeight: 1.2,
        fontWeight: fontWeights.bold,
        letterSpacing: "-0.01em",
    },

    // Headings
    h1: {
        fontSize: "2.5rem", // 40px
        lineHeight: 1.3,
        fontWeight: fontWeights.semibold,
        letterSpacing: "-0.01em",
    },
    h2: {
        fontSize: "2rem", // 32px
        lineHeight: 1.3,
        fontWeight: fontWeights.semibold,
        letterSpacing: "-0.005em",
    },
    h3: {
        fontSize: "1.75rem", // 28px
        lineHeight: 1.4,
        fontWeight: fontWeights.semibold,
        letterSpacing: "0",
    },
    h4: {
        fontSize: "1.5rem", // 24px
        lineHeight: 1.4,
        fontWeight: fontWeights.semibold,
        letterSpacing: "0",
    },
    h5: {
        fontSize: "1.25rem", // 20px
        lineHeight: 1.5,
        fontWeight: fontWeights.semibold,
        letterSpacing: "0",
    },
    h6: {
        fontSize: "1rem", // 16px
        lineHeight: 1.5,
        fontWeight: fontWeights.semibold,
        letterSpacing: "0",
    },

    // Body text
    body1: {
        fontSize: "1rem", // 16px
        lineHeight: 1.5,
        fontWeight: fontWeights.regular,
        letterSpacing: "0",
    },
    body2: {
        fontSize: "0.875rem", // 14px
        lineHeight: 1.43,
        fontWeight: fontWeights.regular,
        letterSpacing: "0",
    },

    // Small text
    caption: {
        fontSize: "0.75rem", // 12px
        lineHeight: 1.66,
        fontWeight: fontWeights.regular,
        letterSpacing: "0.03em",
    },
    overline: {
        fontSize: "0.75rem", // 12px
        lineHeight: 2.66,
        fontWeight: fontWeights.medium,
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
    },

    // Button
    button: {
        fontSize: "0.875rem", // 14px
        lineHeight: 1.75,
        fontWeight: fontWeights.medium,
        letterSpacing: "0.02em",
        textTransform: "none" as const,
    },

    // Code
    code: {
        fontSize: "0.875rem", // 14px
        lineHeight: 1.6,
        fontWeight: fontWeights.regular,
        fontFamily: fonts.mono,
    },
} as const;
