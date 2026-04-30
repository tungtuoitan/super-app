/**
 * Locale detection and management utilities.
 *
 * This module provides functionality for:
 * - Automatic locale detection based on browser settings
 * - Fallback to default locale when detection fails
 * - Integration with application locale configuration
 */

import { config, Locale } from "config/app.config";

/**
 * Get the user's locale language based on browser settings.
 *
 * This function attempts to detect the user's preferred locale by:
 * 1. Getting the browser's date formatting
 * 2. Comparing it with supported locales
 * 3. Falling back to default locale if detection fails
 *
 * @returns The detected locale or default locale ('en-us')
 *
 * @example
 * ```typescript
 * const userLocale = getLocaleLanguage();
 * ```
 */
export function getLocaleLanguage(): Locale {
    const defaultLocale: Locale = "en-us";
    const locales = Object.keys(config.locales) as Locale[];

    try {
        const options: Intl.DateTimeFormatOptions = {
            year: "numeric",
            month: "numeric",
            day: "numeric",
        };

        const localDateString = new Date().toLocaleDateString();

        for (const locale of locales) {
            const formattedDate = new Date().toLocaleDateString(locale, options);
            if (localDateString === formattedDate) {
                return locale;
            }
        }
    } catch (error) {
        console.error("Error detecting locale:", error);
    }

    return defaultLocale;
}
