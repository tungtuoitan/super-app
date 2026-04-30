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

// =============================================================================
// DATE RANGE SLIDER HELPERS
// Used in GenericFilterPopup for date range filtering
// =============================================================================

/**
 * Convert slider index to month string (YYYY-MM format)
 * Range: 0 = 24 months ago, 25 = current month + 1
 *
 * @param index - Slider index (0-25)
 * @returns Month string in YYYY-MM format
 *
 * @example
 * getMonthFromIndex(0); // "2023-12" (if current is 2025-12)
 * getMonthFromIndex(24); // "2025-12" (current month)
 * getMonthFromIndex(25); // "2026-01" (next month)
 */
export const getMonthFromIndex = (index: number): string => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() - (24 - index), 1);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};

/**
 * Convert month string (YYYY-MM) to slider index
 * Range: 0 = 24 months ago, 25 = current month + 1
 *
 * @param monthStr - Month string in YYYY-MM format
 * @returns Slider index (0-25)
 *
 * @example
 * getIndexFromMonth("2025-12"); // 24 (current month)
 * getIndexFromMonth("2023-12"); // 0 (24 months ago)
 */
export const getIndexFromMonth = (monthStr: string): number => {
    if (!monthStr) return 0;
    const [year, month] = monthStr.split("-").map(Number);
    const targetDate = new Date(year, month - 1, 1);
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const diffInMonths = (targetDate.getFullYear() - currentDate.getFullYear()) * 12 + (targetDate.getMonth() - currentDate.getMonth());
    return 24 + diffInMonths; // 24 = offset for 2 years back, can go to 25 (current + 1)
};

/**
 * Format month string (YYYY-MM) to display label (DD/MM/YYYY)
 * Used for slider labels in date range filter
 *
 * @param monthStr - Month string in YYYY-MM format
 * @returns Formatted display string (01/MM/YYYY)
 *
 * @example
 * formatMonthLabel("2025-12"); // "01/12/2025"
 * formatMonthLabel("2023-01"); // "01/01/2023"
 */
export const formatMonthLabel = (monthStr: string): string => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-").map(Number);
    return `01/${month}/${year}`;
};
