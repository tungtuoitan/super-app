/**
 * shadcn-compatible theme adapter
 *
 * This file maps existing design tokens (colors, spacing, borderRadius, typography)
 * into a shape and CSS custom properties that are convenient for using with
 * shadcn/ui or tailwind-based components that expect CSS variables.
 *
 * Usage:
 * import { shadcnTokens, applyShadcnTheme } from '@/lib/theme/shadcn'
 * applyShadcnTheme(document.documentElement)
 *
 */
import { colors, semanticColors } from "./colors";
import { spacing, semanticSpacing } from "./spacing";
import { borderRadius, semanticBorderRadius } from "./borderRadius";
import { fonts, typography, fontWeights } from "./typography";

// Token object exported for programmatic usage
export const shadcnTokens = {
    colors: {
        primary: colors.primary[500],
        secondary: colors.secondary[500],
        success: colors.success[500],
        warning: colors.warning[500],
        error: colors.error[500],
        info: colors.info[500],
        neutral: {
            50: colors.neutral[50],
            100: colors.neutral[100],
            200: colors.neutral[200],
            300: colors.neutral[300],
            400: colors.neutral[400],
            500: colors.neutral[500],
            600: colors.neutral[600],
            700: colors.neutral[700],
            800: colors.neutral[800],
            900: colors.neutral[900],
        },
        textPrimary: semanticColors.text.primary,
        textSecondary: semanticColors.text.secondary,
        background: semanticColors.background.default,
        surface: semanticColors.background.paper,
        border: semanticColors.border.main,
    },
    spacing,
    semanticSpacing,
    borderRadius: semanticBorderRadius,
    fonts: {
        primary: fonts.primary,
        secondary: fonts.secondary,
        mono: fonts.mono,
    },
    typography,
    fontWeights,
} as const;

// Utility: apply CSS variables to an element (documentElement recommended)
export function applyShadcnTheme(el: HTMLElement = document.documentElement) {
    const set = (k: string, v: string) => el.style.setProperty(k, v);

    // Colors
    set("--shadcn-col-primary", shadcnTokens.colors.primary);
    set("--shadcn-col-secondary", shadcnTokens.colors.secondary);
    set("--shadcn-col-success", shadcnTokens.colors.success);
    set("--shadcn-col-warning", shadcnTokens.colors.warning);
    set("--shadcn-col-error", shadcnTokens.colors.error);
    set("--shadcn-col-info", shadcnTokens.colors.info);
    set("--shadcn-col-bg", shadcnTokens.colors.background);
    set("--shadcn-col-surface", shadcnTokens.colors.surface);
    set("--shadcn-col-text-primary", shadcnTokens.colors.textPrimary);
    set("--shadcn-col-text-secondary", shadcnTokens.colors.textSecondary);
    set("--shadcn-col-border", shadcnTokens.colors.border);

    // Neutral scale
    Object.entries(shadcnTokens.colors.neutral).forEach(([k, v]) => {
        set(`--shadcn-neutral-${k}`, v);
    });

    // Spacing (limited set)
    Object.entries(shadcnTokens.spacing).forEach(([k, v]) => {
        set(`--shadcn-space-${k}`, v);
    });

    // Border radius
    Object.entries(shadcnTokens.borderRadius).forEach(([k, v]) => {
        set(`--shadcn-radius-${k}`, v);
    });

    // Fonts
    set("--shadcn-font-primary", shadcnTokens.fonts.primary);
    set("--shadcn-font-secondary", shadcnTokens.fonts.secondary);
    set("--shadcn-font-mono", shadcnTokens.fonts.mono);

    // Typography sizes (map a few semantic tokens)
    set("--shadcn-typo-h1", typography.h1.fontSize as string);
    set("--shadcn-typo-h2", typography.h2.fontSize as string);
    set("--shadcn-typo-h3", typography.h3.fontSize as string);
    set("--shadcn-typo-body", typography.body1.fontSize as string);
    set("--shadcn-typo-small", typography.caption.fontSize as string);

    // Font weights
    Object.entries(fontWeights).forEach(([k, v]) => {
        set(`--shadcn-font-weight-${k}`, String(v));
    });
}

export default shadcnTokens;
