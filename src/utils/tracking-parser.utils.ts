/**
 * Tracking Parser Utilities
 * Parse markdown checkbox items for tracking visualization
 */

import type { TrackingItem, DailyTracking, UniqueTrackingItem, ChartDataPoint, GroupedTrackingItems } from "@/types/tracking.types";

/**
 * Parse date from note name in DD-MM-YYYY format
 * @param noteName - Note name like "25-01-2026"
 * @returns Parsed date or null if invalid format
 */
export function parseDateFromNoteName(noteName: string): Date | null {
    // Match DD-MM-YYYY format
    const match = noteName.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return null;

    const [, dayStr, monthStr, yearStr] = match;
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    // Validate date parts
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    // Create date (month is 0-indexed in JS)
    const date = new Date(year, month - 1, day);

    // Verify the date is valid (handles invalid days like Feb 30)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
        return null;
    }

    return date;
}

/**
 * Normalize item text to create a consistent key
 * @param text - Item text
 * @returns Normalized key (lowercase, trimmed)
 */
export function normalizeItemKey(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Extract note from item text
 * Format: "item text ((any note here))" - content inside double parentheses (())
 * Note can appear anywhere in the text, not just at the end
 * @param text - Raw item text
 * @returns Object with cleaned text and optional note
 */
export function extractNoteFromText(text: string): { text: string; note?: string } {
    // Match "((...))' anywhere in text - double parentheses with any content inside
    const noteMatch = text.match(/\(\((.+?)\)\)/);
    if (noteMatch) {
        const note = noteMatch[1].trim();
        const cleanText = text.replace(/\(\(.+?\)\)/, "").trim();
        return { text: cleanText, note };
    }
    return { text: text.trim() };
}

/**
 * Parse tracking items from markdown content
 * Supports formats:
 * - [v] task done (green dot)
 * - [x] task not done (orange dot)
 * - [] task N/A (no dot)
 * - [!v] negative done (orange - bad)
 * - [!x] negative not done (green - good)
 *
 * @param markdown - Markdown content
 * @returns Array of parsed tracking items
 */
export function parseTrackingItems(markdown: string): TrackingItem[] {
    const items: TrackingItem[] = [];
    // Handle both Windows (\r\n) and Unix (\n) line endings
    const lines = markdown.split(/\r?\n/);
    let currentSection = "Default";

    // Skip YAML frontmatter if present (--- ... ---)
    let startIndex = 0;
    if (lines[0]?.trim() === "---") {
        for (let i = 1; i < lines.length; i++) {
            if (lines[i]?.trim() === "---") {
                startIndex = i + 1;
                break;
            }
        }
    }

    for (let i = startIndex; i < lines.length; i++) {
        const rawLine = lines[i];
        // Trim whitespace and carriage returns
        const line = rawLine.trim();

        // Skip empty lines
        if (!line) continue;

        // Check for heading (section)
        const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
        if (headingMatch) {
            currentSection = headingMatch[1].trim();
            continue;
        }

        // Check for tracking checkbox
        // Pattern: [v] or [x] or [] followed by text
        // Negative items have "!" at the START of item name: [v] !item name
        const checkboxMatch = line.match(/^\[([vx]?)\]\s*(.+)$/);
        if (checkboxMatch) {
            const [, value, rawText] = checkboxMatch;
            const checkboxValue = (value as 'v' | 'x' | '') || '';

            // Extract note from text if present
            const { text: textWithoutNote, note } = extractNoteFromText(rawText);

            // Check for negative marker "!" at the START or END of item name
            const isNegative = textWithoutNote.startsWith('!') || textWithoutNote.endsWith('!');
            // Keep item text as-is (including the "!")
            const itemText = textWithoutNote;

            items.push({
                text: itemText,
                key: normalizeItemKey(itemText),
                value: checkboxValue,
                isNegative,
                section: currentSection,
                note,
            });
        }
    }

    return items;
}

/**
 * Parse a note into DailyTracking data
 * @param noteId - Note ID
 * @param noteName - Note name (should be DD-MM-YYYY format)
 * @param markdown - Note markdown content
 * @returns DailyTracking or null if note name is not a valid date
 */
export function parseNoteToDailyTracking(
    noteId: number,
    noteName: string,
    markdown: string
): DailyTracking | null {
    const date = parseDateFromNoteName(noteName);
    if (!date) return null;

    const items = parseTrackingItems(markdown);

    return {
        noteId,
        noteName,
        date,
        year: date.getFullYear(),
        month: date.getMonth() + 1, // 1-12
        day: date.getDate(),
        items,
    };
}

/**
 * Extract unique tracking items from all daily trackings
 * Uses section and note from the LATEST tracking file (assumes trackings are sorted by date DESC)
 * @param trackings - Array of daily tracking data (sorted by date descending)
 * @returns Array of unique items with aggregated counts
 */
export function extractUniqueItems(trackings: DailyTracking[]): UniqueTrackingItem[] {
    if (trackings.length === 0) return [];

    // First pass: collect all items with counts
    const itemMap = new Map<string, UniqueTrackingItem>();

    for (const tracking of trackings) {
        for (const item of tracking.items) {
            const existing = itemMap.get(item.key);

            if (existing) {
                existing.totalCount++;
                if (item.value === 'v') existing.doneCount++;
                if (item.value === 'x') existing.notDoneCount++;
            } else {
                itemMap.set(item.key, {
                    key: item.key,
                    text: item.text,
                    section: item.section,
                    isNegative: item.isNegative,
                    totalCount: 1,
                    doneCount: item.value === 'v' ? 1 : 0,
                    notDoneCount: item.value === 'x' ? 1 : 0,
                    note: item.note,
                });
            }
        }
    }

    // Second pass: update section, note from the latest tracking file (first in array)
    const latestTracking = trackings[0];
    for (const item of latestTracking.items) {
        const uniqueItem = itemMap.get(item.key);
        if (uniqueItem) {
            uniqueItem.section = item.section;
            uniqueItem.note = item.note;
        }
    }

    // Build result ordered by section order in latest file, then by appearance order in that section
    const result: UniqueTrackingItem[] = [];
    const addedKeys = new Set<string>();

    // Add items in order they appear in the latest tracking
    for (const item of latestTracking.items) {
        if (!addedKeys.has(item.key)) {
            const uniqueItem = itemMap.get(item.key);
            if (uniqueItem) {
                result.push(uniqueItem);
                addedKeys.add(item.key);
            }
        }
    }

    // Add any remaining items not in latest tracking (sorted by count)
    const remainingItems = Array.from(itemMap.values())
        .filter(item => !addedKeys.has(item.key))
        .sort((a, b) => b.totalCount - a.totalCount);
    result.push(...remainingItems);

    return result;
}

/**
 * Group unique items by section (following order from the latest tracking file)
 * @param uniqueItems - Array of unique items (already ordered by latest file)
 * @returns Array of grouped items
 */
export function groupItemsBySection(uniqueItems: UniqueTrackingItem[]): GroupedTrackingItems[] {
    const groups: GroupedTrackingItems[] = [];
    const sectionMap = new Map<string, UniqueTrackingItem[]>();
    const sectionOrder: string[] = [];

    for (const item of uniqueItems) {
        if (!sectionMap.has(item.section)) {
            sectionMap.set(item.section, []);
            sectionOrder.push(item.section);
        }
        sectionMap.get(item.section)!.push(item);
    }

    for (const section of sectionOrder) {
        groups.push({
            section,
            items: sectionMap.get(section)!,
        });
    }

    return groups;
}

/**
 * Get available years from tracking data
 * @param trackings - Array of daily tracking data
 * @returns Sorted array of unique years (descending)
 */
export function getAvailableYears(trackings: DailyTracking[]): number[] {
    const years = new Set<number>();
    for (const tracking of trackings) {
        years.add(tracking.year);
    }
    return Array.from(years).sort((a, b) => b - a);
}

/**
 * Get available months for a specific year
 * @param trackings - Array of daily tracking data
 * @param year - Year to filter by (null = all years)
 * @returns Sorted array of unique months (1-12)
 */
export function getAvailableMonths(trackings: DailyTracking[], year: number | null): number[] {
    const months = new Set<number>();
    for (const tracking of trackings) {
        if (year === null || tracking.year === year) {
            months.add(tracking.month);
        }
    }
    return Array.from(months).sort((a, b) => a - b);
}

/**
 * Filter trackings by year and month
 * @param trackings - Array of daily tracking data
 * @param year - Year filter (null = all)
 * @param month - Month filter (null = all)
 * @returns Filtered trackings
 */
export function filterTrackings(
    trackings: DailyTracking[],
    year: number | null,
    month: number | null
): DailyTracking[] {
    return trackings.filter((t) => {
        if (year !== null && t.year !== year) return false;
        if (month !== null && t.month !== month) return false;
        return true;
    });
}

/**
 * Convert tracking data to chart format for Recharts
 * Only 2 values: v (done/happened = 1), x/empty/missing (not done = 0)
 * @param trackings - Filtered daily tracking data
 * @param selectedItems - Item keys to include in chart
 * @param uniqueItems - Map of unique items for note lookup
 * @returns Array of chart data points
 */
export function convertToChartData(
    trackings: DailyTracking[],
    selectedItems: string[],
    uniqueItems: UniqueTrackingItem[]
): ChartDataPoint[] {
    // Sort trackings by date
    const sortedTrackings = [...trackings].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Create lookup for notes from uniqueItems
    const noteMap = new Map<string, string | undefined>();
    for (const item of uniqueItems) {
        noteMap.set(item.key, item.note);
    }

    return sortedTrackings.map((tracking) => {
        const dataPoint: ChartDataPoint = {
            dateLabel: `${String(tracking.day).padStart(2, '0')}-${String(tracking.month).padStart(2, '0')}`,
            date: tracking.date,
            noteId: tracking.noteId,
        };

        // Add value for each selected item
        // v = 1 (done/happened), x/empty/missing = 0 (not done)
        for (const itemKey of selectedItems) {
            const item = tracking.items.find((i) => i.key === itemKey);

            if (item && item.value === 'v') {
                // Done/happened
                dataPoint[itemKey] = 1;
            } else {
                // Not done: x, empty, or item not in file
                dataPoint[itemKey] = 0;
            }

            // Store note if item has one (from the item itself or from uniqueItems)
            const itemNote = item?.note || noteMap.get(itemKey);
            if (itemNote) {
                dataPoint[`${itemKey}_note`] = itemNote;
            }
        }

        return dataPoint;
    });
}

/**
 * Get display color for an item value (dot color)
 * Only 2 values: 1 = done (green), 0 = not done (no dot)
 * Negative items always use red instead of green
 * @param value - Chart value (1 = done, 0 = not done)
 * @param isNegative - Whether the item is a negative behavior (uses red)
 * @returns Hex color code
 */
export function getItemColor(value: number, isNegative: boolean): string {
    // Not done - no dot
    if (value === 0) return "transparent";

    // Done (v) - green for normal, red for negative
    return isNegative ? "#ef4444" : "#22c55e"; // Red for negative, Green for positive
}

/**
 * Generate a consistent color for a line based on item index
 * Note: Red (#ef4444) is NOT included - it's reserved for negative items (!items)
 * @param index - Index in the selected items array
 * @returns Hex color code
 */
export function getLineColor(index: number): string {
    const colors = [
        "#3b82f6", // blue
        "#22c55e", // green
        "#f59e0b", // amber
        "#8b5cf6", // violet
        "#06b6d4", // cyan
        "#ec4899", // pink
        "#14b8a6", // teal
        "#f97316", // orange
        "#6366f1", // indigo
        "#84cc16", // lime
    ];
    return colors[index % colors.length];
}

/**
 * Calculate statistics from tracking data
 */
export function calculateTrackingStats(
    trackings: DailyTracking[],
    uniqueItems: UniqueTrackingItem[]
) {
    const totalDays = trackings.length;
    const totalItems = uniqueItems.length;

    let totalDone = 0;
    let totalNotDone = 0;

    for (const item of uniqueItems) {
        totalDone += item.doneCount;
        totalNotDone += item.notDoneCount;
    }

    const totalTracked = totalDone + totalNotDone;
    const completionRate = totalTracked > 0 ? Math.round((totalDone / totalTracked) * 100) : 0;

    return {
        totalDays,
        totalItems,
        totalDone,
        totalNotDone,
        completionRate,
    };
}
