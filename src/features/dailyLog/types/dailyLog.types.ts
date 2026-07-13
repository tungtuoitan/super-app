export type DailyLogSection = "input" | "output";
export type DailyLogFieldType = "text" | "longText" | "checkbox" | "number" | "range";

export interface DailyLog {
    id: number;
    userId: number;
    logDate: Date;
    valuesJson: string;
    /**
     * Snapshot of the template that was active when this log was last saved.
     * Rendered as the form structure for this specific log — decouples past logs
     * from future template edits. Null on legacy rows (falls back to live template).
     */
    templateJson: string | null;
    createdAt: Date;
    updatedAt: Date | null;
    deletedAt: Date | null;
}

export interface DailyLogFieldTemplate {
    id: number;
    userId: number;
    section: DailyLogSection;
    fieldKey: string;
    label: string;
    fieldType: DailyLogFieldType;
    /** For fieldType="range": inclusive min bound. Ignored for other types. */
    rangeMin?: number | null;
    /** For fieldType="range": inclusive max bound. Ignored for other types. */
    rangeMax?: number | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date | null;
    deletedAt: Date | null;
}

export interface DailyLogHistoryPoint {
    logDate: Date;
    value: string;
}

/** UI row model — 1 row per date within the current date range. `log` is null when no data exists yet. */
export interface DailyLogRow {
    logDate: Date;
    log: DailyLog | null;
    preview: string;
    hasEmotion: boolean;
}

export type DailyLogValuesMap = Record<string, string | number | boolean>;
