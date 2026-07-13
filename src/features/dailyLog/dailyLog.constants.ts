import type { DailyLogFieldType, DailyLogSection } from "./types/dailyLog.types";

export const dailyLogConstants = {
    sections: ["input", "output"] as const satisfies readonly DailyLogSection[],

    sectionLabels: {
        input: "Input",
        output: "Output",
    } as Record<DailyLogSection, string>,

    fieldTypes: ["text", "longText", "checkbox", "number", "range"] as const satisfies readonly DailyLogFieldType[],

    fieldTypeLabels: {
        text: "Text",
        longText: "Long text",
        checkbox: "Checkbox",
        number: "Number",
        range: "Range (slider)",
    } as Record<DailyLogFieldType, string>,

    /** Default min/max applied when a user picks fieldType = "range". */
    rangeDefaults: { min: 0, max: 10 },

    /** Default template (mirrors backend seed in DailyLogTemplateService.BuildDefaultTemplate). */
    defaultTemplate: [
        { section: "input" as const,  fieldKey: "general",      label: "General",      fieldType: "longText" as const, sortOrder: 0, rangeMin: null, rangeMax: null },
        { section: "input" as const,  fieldKey: "note",         label: "Note",         fieldType: "longText" as const, sortOrder: 1, rangeMin: null, rangeMax: null },
        { section: "output" as const, fieldKey: "general",      label: "General",      fieldType: "longText" as const, sortOrder: 0, rangeMin: null, rangeMax: null },
        { section: "output" as const, fieldKey: "emotion_note", label: "Emotion note", fieldType: "longText" as const, sortOrder: 1, rangeMin: null, rangeMax: null },
        { section: "output" as const, fieldKey: "note",         label: "Note",         fieldType: "longText" as const, sortOrder: 2, rangeMin: null, rangeMax: null },
    ],

    /** Quick date-range presets shown as chips above the grid. */
    datePresets: [
        { key: "today",     label: "Today" },
        { key: "yesterday", label: "Yesterday" },
        { key: "last7",     label: "Last 7 days" },
        { key: "last30",    label: "Last 30 days" },
        { key: "thisMonth", label: "This month" },
        { key: "custom",    label: "Custom" },
    ] as const,

    /** Preview column: how many characters of input.general to show. */
    previewLength: 60,

    /** History dialog: default lookback window in days. */
    historyDefaultDays: 90,
} as const;

export type DailyLogDatePresetKey = typeof dailyLogConstants.datePresets[number]["key"];
