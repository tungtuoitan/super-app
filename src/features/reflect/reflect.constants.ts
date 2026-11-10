import type { ReflectSaveState } from "./types/reflect.types";

export const reflectConstants = {
    moduleId: "Reflect",
    tabId: "reflect-tab",
    tabTitle: "Reflect",
    /** Wait after the last keystroke before a row is written to the database */
    saveDelayMs: 800,
    color: "#f59e0b",
    /** Makes every text cell of the sheet two lines tall before it grows */
    sheetCellClass: "[&_textarea]:min-h-14",
    journalTitle: "Reflect",
    viewButtonLabel: "Reflect journal",
    viewHint: "Write what you think before you start. Fill in the reality afterwards.",
    stateLabels: {
        loading: "Loading…",
        idle: "",
        saving: "Saving…",
        saved: "Saved",
        error: "Save failed — changes are kept here, edit a row to try again",
    } as Record<ReflectSaveState, string>,
} as const;
