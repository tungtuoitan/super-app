import type { ReflectField, ReflectRow } from "@/features/taskDetail";

/** Where the journal is in saving: loading the rows, nothing pending, writing a row, written, or failed */
export type ReflectSaveState = "loading" | "idle" | "saving" | "saved" | "error";

/** One saved Reflect row as the server returns it */
export interface ReflectEntryDTO {
    id: string;
    userId: number;
    type: string;
    think: string;
    real: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    /** Kind of entry set when Claude processed the row; empty until then */
    tag?: string | null;
    /** Worth reading (thought vs reality, a lesson, a decision): marked by Claude when it processed the row */
    isHighlight?: boolean;
}

export interface UpsertReflectEntryRequest {
    id: string;
    type: string;
    think: string;
    real: string;
}

/** One edit of a row field; `nowIso` is the moment of the edit (it becomes the row's creation time the first time the row gets text) */
export interface ReflectFieldChange {
    rowId: string;
    field: ReflectField;
    value: string;
    nowIso: string;
}

export interface ReflectActions {
    loadStarted: () => void;
    loaded: (rows: ReflectRow[]) => void;
    loadFailed: () => void;
    fieldChanged: (change: ReflectFieldChange) => void;
    rowAdded: () => void;
    saveStarted: () => void;
    rowStored: (rowId: string) => void;
    rowRemoved: (rowId: string) => void;
    saveFailed: () => void;
}

export interface ReflectState {
    rows: ReflectRow[];
    saveState: ReflectSaveState;
    /** Ids of rows that exist in the database (a cleared row is only deleted when it is in here) */
    storedIds: ReadonlySet<string>;
    /** Ids of the rows that were there when the journal opened (rows written since stay visible even before Claude has read them) */
    loadedIds: ReadonlySet<string>;
    actions: ReflectActions;
}

/** One thing read out of a Reflect row for one day: only what applies is filled (a number, a text, an item) */
export interface ReflectSeriesPointDTO {
    /** Calendar day, "YYYY-MM-DD" */
    date: string;
    value: number | null;
    text: string | null;
    /** Sub-key inside a metric, e.g. which suggestion sentence; empty when the metric has none */
    item: string;
    /** The words the point was read from */
    quote: string;
}

/** How a series is drawn. `auto` lets the page guess from the points; the others are a hint stored with the metric */
export type ReflectShape = "auto" | "flag" | "count" | "level" | "items" | "range" | "list";

/** One metric (km run, bedtime, a suggestion sentence...) with all its points; the page decides how to draw it */
export interface ReflectSeriesDTO {
    code: string;
    label: string;
    unit: string;
    /** How values of one day combine: sum (amounts), avg (levels) or max */
    aggregate: "sum" | "avg" | "max";
    shape: ReflectShape;
    /** Hidden behind privacy mode */
    sensitive: boolean;
    points: ReflectSeriesPointDTO[];
}

export interface ReflectChartsActions {
    loadStarted: () => void;
    loaded: (series: ReflectSeriesDTO[]) => void;
    loadFailed: () => void;
}

export interface ReflectChartsState {
    series: ReflectSeriesDTO[];
    isLoading: boolean;
    actions: ReflectChartsActions;
}

/** One point as the chart library wants it */
export interface ReflectChartPoint {
    label: string;
    value: number;
}

export interface ReflectViewActions {
    showAllToggled: () => void;
    tagChanged: (tag: string) => void;
    searchChanged: (text: string) => void;
}

export interface ReflectViewState {
    /** Off: only the rows worth reading (plus new ones and the empty row). On: every row */
    showAll: boolean;
    /** Empty means every tag */
    tagFilter: string;
    searchText: string;
    actions: ReflectViewActions;
}

/** What every chart shape gets: the whole series, it picks what it needs */
export interface ReflectChartKindProps {
    series: ReflectSeriesDTO;
}
