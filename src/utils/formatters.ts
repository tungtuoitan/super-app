/**
 * Formatting utility functions for consistent data display.
 *
 * This module provides standardized formatting functions for:
 * - Date and time formatting with internationalization support
 * - Value validation and emptiness checking
 * - Consistent data presentation across the application
 */

/**
 * Format a date to a localized string representation.
 *
 * @param date - The date to format
 * @param locale - The locale for formatting (defaults to 'en-US')
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 *
 * @example
 * ```typescript
 * const date = new Date('2024-01-15');
 * formatDate(date); // "Jan 15, 2024"
 * formatDate(date, 'de-DE'); // "15. Jan. 2024"
 * ```
 */
export function formatDate(date: Date, locale: string = "en-US"): string {
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(date);
}

/**
 * Format a date with time to a localized string representation.
 *
 * @param date - The date to format
 * @param locale - The locale for formatting (defaults to 'en-US')
 * @returns Formatted date and time string (e.g., "Jan 15, 2024, 02:30 PM")
 *
 * @example
 * ```typescript
 * const date = new Date('2024-01-15T14:30:00');
 * formatDateTime(date); // "Jan 15, 2024, 02:30 PM"
 * ```
 */
export function formatDateTime(date: Date, locale: string = "en-US"): string {
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

/**
 * Check if a value is considered empty.
 *
 * This function handles various types of empty checks:
 * - null and undefined values
 * - Empty strings (including whitespace-only strings)
 * - Empty arrays
 * - Empty objects
 *
 * @param value - The value to check for emptiness
 * @returns True if the value is empty, false otherwise
 *
 * @example
 * ```typescript
 * isEmpty(null); // true
 * isEmpty(''); // true
 * isEmpty('   '); // true
 * isEmpty([]); // true
 * isEmpty({}); // true
 * isEmpty('hello'); // false
 * isEmpty([1, 2, 3]); // false
 * ```
 */
export function isEmpty(value: any): boolean {
    const type = typeof value;

    if (value === null || value === undefined) {
        return true;
    }

    if (type === "string") {
        return value.trim() === "";
    }

    if (Array.isArray(value)) {
        return value.length === 0;
    }

    if (type === "object") {
        return Object.keys(value).length === 0;
    }

    return !value;
}

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
};
