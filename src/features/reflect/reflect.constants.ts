import type { ReflectSaveState } from "./types/reflect.types";

export const reflectConstants = {
    moduleId: "Reflect",
    tabId: "reflect-tab",
    tabTitle: "Reflect",
    /** Key of this view in the user's saved filters (UserFilters) and in the filter registry */
    filterViewKey: "reflect",
    /** Wait after the last keystroke before a row is written to the database */
    saveDelayMs: 800,
    color: "#f59e0b",
    /** Every text cell of the sheet is two lines tall before it grows; the sheet's own Add row button is hidden (an empty row is always there) */
    sheetCellClass: "[&_textarea]:min-h-14 [&>div>button]:hidden",
    journalTitle: "Reflect",
    viewButtonLabel: "Reflect journal",
    searchPlaceholder: "Search",
    searchLabel: "Search Reflect",
    searchDebounceMs: 300,
    searchInputClass: "h-6 w-44 rounded-md border border-sa-border bg-transparent pl-7 pr-2 text-[12px] outline-none focus:bg-sa-hover",
    viewHint: "Write what you think before you start. Fill in the reality afterwards.",
    stateLabels: {
        loading: "Loading…",
        idle: "",
        saving: "Saving…",
        saved: "Saved",
        error: "Save failed — changes are kept here, edit a row to try again",
    } as Record<ReflectSaveState, string>,
} as const;
