/**
 * Tracking Graph Types
 * Type definitions for tracking data visualization feature
 */

/**
 * A single tracking item parsed from markdown checkbox
 * Example: [v] dọn phòng → { text: "dọn phòng", value: "v", isNegative: false }
 * Example: [!x] hút thuốc → { text: "hút thuốc", value: "x", isNegative: true }
 * Example: [v] item (note: some note) → { text: "item", note: "some note", ... }
 */
export interface TrackingItem {
    /** Display text of the item (e.g., "dọn phòng") */
    text: string;
    /** Normalized key for grouping same items across days */
    key: string;
    /** Checkbox value: 'v' (done), 'x' (not done), '' (N/A) */
    value: 'v' | 'x' | '';
    /** Whether this is a negative behavior (has "!" prefix) */
    isNegative: boolean;
    /** The markdown heading section this item belongs to */
    section: string;
    /** Optional note extracted from "(note: xxx)" */
    note?: string;
}

/**
 * Tracking data for a single day (parsed from one note)
 */
export interface DailyTracking {
    /** Note ID for reference */
    noteId: number;
    /** Note name */
    noteName: string;
    /** Parsed date from note name (DD-MM-YYYY format) */
    date: Date;
    /** Year extracted from date */
    year: number;
    /** Month extracted from date (1-12) */
    month: number;
    /** Day of month (1-31) */
    day: number;
    /** All tracking items for this day */
    items: TrackingItem[];
}

/**
 * Filter state for the tracking graph
 */
export interface TrackingFilters {
    /** Selected year (null = all years) */
    year: number | null;
    /** Selected month (null = all months) */
    month: number | null;
    /** Selected item keys to display in chart */
    selectedItems: string[];
}

/**
 * A unique tracking item with metadata
 */
export interface UniqueTrackingItem {
    /** Normalized key */
    key: string;
    /** Display text */
    text: string;
    /** Section it belongs to (from the latest file) */
    section: string;
    /** Whether it's a negative behavior */
    isNegative: boolean;
    /** Total count of times this item appears */
    totalCount: number;
    /** Count of 'v' (done) */
    doneCount: number;
    /** Count of 'x' (not done) */
    notDoneCount: number;
    /** Optional note extracted from "(note: xxx)" in latest file */
    note?: string;
}

/**
 * Grouped items by section (from the latest tracking file)
 */
export interface GroupedTrackingItems {
    /** Section/group name */
    section: string;
    /** Items in this group */
    items: UniqueTrackingItem[];
}

/**
 * Single data point for the chart
 */
export interface ChartDataPoint {
    /** Date label (DD-MM) */
    dateLabel: string;
    /** Full date for sorting */
    date: Date;
    /** Note ID for reference */
    noteId: number;
    /** Dynamic keys for each selected item: value is 1 (done), 0.5 (not done), or 0 (N/A) */
    [itemKey: string]: string | Date | number;
}

/**
 * Folder data for opening tracking graph
 */
export interface TrackingGraphFolderData {
    /** Folder ID to load tracking data from */
    folderId: number;
    /** Folder name for display */
    folderName: string;
    /** Workspace ID */
    workspaceId: number;
}

/**
 * Tracking graph tab data (stored in tab.data)
 */
export interface TrackingGraphTabData {
    /** Unique ID for the tracking graph tab */
    id: number;
    /** Display name */
    name: string;
    /** Source folder ID */
    folderId: number;
    /** Source folder name */
    folderName: string;
    /** Workspace ID */
    workspaceId: number;
}
