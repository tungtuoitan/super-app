/**
 * Date Utilities
 * Handle timezone conversion between local time and UTC for API communication
 *
 * Problem: JavaScript Date.toISOString() always converts to UTC, causing timezone shift
 * Solution: Create ISO string that preserves local time as if it were UTC
 */

/**
 * Convert local Date to ISO string preserving the local time values
 * This sends the local time to backend as-is (backend will store as UTC)
 *
 * Example: Local time 2024-01-15 09:00 (Vietnam GMT+7)
 * - Date.toISOString() -> "2024-01-15T02:00:00.000Z" (shifted to UTC)
 * - toLocalISOString() -> "2024-01-15T09:00:00.000Z" (preserves local time)
 *
 * @param date - Local Date object
 * @returns ISO string with local time values
 */
export function toLocalISOString(date: Date | null | undefined): string | null {
    if (!date) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
}

/**
 * Parse ISO string from backend as local time
 * Backend stores in UTC, but we treat it as local time
 *
 * Example: Backend returns "2024-01-15T09:00:00.000Z"
 * - new Date(isoString) -> interprets as UTC, displays as local (wrong)
 * - parseAsLocalDate() -> treats values as local time (correct)
 *
 * @param isoString - ISO string from backend
 * @returns Date object with values interpreted as local time
 */
export function parseAsLocalDate(isoString: string | null | undefined): Date | null {
    if (!isoString) return null;

    // Parse the ISO string components
    const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?/);
    if (!match) {
        // Fallback to standard parsing if format doesn't match
        return new Date(isoString);
    }

    const [, year, month, day, hours, minutes, seconds, milliseconds = '0'] = match;

    // Create date using local time constructor
    return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1, // Month is 0-indexed
        parseInt(day, 10),
        parseInt(hours, 10),
        parseInt(minutes, 10),
        parseInt(seconds, 10),
        parseInt(milliseconds, 10)
    );
}
