/**
 * Design System - Color Tokens
 * All color definitions following the design system specification
 */

export const colors = {
    // Primary - Brand color
    primary: {
        50: "#E3F2FD",
        100: "#BBDEFB",
        200: "#90CAF9",
        300: "#64B5F6",
        400: "#42A5F5",
        500: "#1976D2", // Main
        600: "#1565C0",
        700: "#0D47A1",
        800: "#0A3D91",
        900: "#073282",
    },

    // Secondary - Accent color
    secondary: {
        50: "#F3E5F5",
        100: "#E1BEE7",
        200: "#CE93D8",
        300: "#BA68C6",
        400: "#AB47BC",
        500: "#9C27B0", // Main
        600: "#8E24AA",
        700: "#7B1FA2",
        800: "#6A1B9A",
        900: "#4A148C",
    },

    // Neutral - Grays
    neutral: {
        50: "#FAFAFA",
        100: "#F5F5F5",
        200: "#EEEEEE",
        300: "#E0E0E0",
        400: "#BDBDBD",
        500: "#9E9E9E", // Main
        600: "#757575",
        700: "#616161",
        800: "#424242",
        900: "#212121",
    },

    // Success - Green
    success: {
        50: "#E8F5E9",
        100: "#C8E6C9",
        200: "#A5D6A7",
        300: "#81C784",
        400: "#66BB6A",
        500: "#4CAF50", // Main
        600: "#43A047",
        700: "#388E3C",
        800: "#2E7D32",
        900: "#1B5E20",
    },

    // Warning - Orange
    warning: {
        50: "#FFF3E0",
        100: "#FFE0B2",
        200: "#FFCC80",
        300: "#FFB74D",
        400: "#FFA726",
        500: "#FF9800", // Main
        600: "#FB8C00",
        700: "#F57C00",
        800: "#EF6C00",
        900: "#E65100",
    },

    // Error - Red
    error: {
        50: "#FFEBEE",
        100: "#FFCDD2",
        200: "#EF9A9A",
        300: "#E57373",
        400: "#EF5350",
        500: "#F44336", // Main
        600: "#E53935",
        700: "#D32F2F",
        800: "#C62828",
        900: "#B71C1C",
    },

    // Info - Blue
    info: {
        50: "#E1F5FE",
        100: "#B3E5FC",
        200: "#81D4FA",
        300: "#4FC3F7",
        400: "#29B6F6",
        500: "#03A9F4", // Main
        600: "#039BE5",
        700: "#0288D1",
        800: "#0277BD",
        900: "#01579B",
    },
} as const;

// Semantic colors (mapped from base colors)
export const semanticColors = {
    // Text
    text: {
        primary: colors.neutral[900],
        secondary: colors.neutral[600],
        disabled: colors.neutral[400],
        inverse: "#FFFFFF",
    },

    // Background
    background: {
        default: "#FAFAFA",
        paper: "#FFFFFF",
        elevated: "#FFFFFF",
        overlay: "rgba(0, 0, 0, 0.5)",
    },

    // Border
    border: {
        light: colors.neutral[200],
        main: colors.neutral[300],
        dark: colors.neutral[400],
    },

    // Action
    action: {
        active: colors.primary[500],
        hover: "rgba(0, 0, 0, 0.04)",
        selected: "rgba(25, 118, 210, 0.08)",
        disabled: colors.neutral[300],
        disabledBackground: colors.neutral[100],
        focus: "rgba(25, 118, 210, 0.12)",
    },

    // Divider
    divider: colors.neutral[200],
} as const;
