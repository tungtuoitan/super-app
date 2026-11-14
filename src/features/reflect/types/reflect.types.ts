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
    /** Kind of entry set by the nightly scan; empty until the row was scanned */
    tag?: string | null;
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
    actions: ReflectActions;
}

export interface ReflectSeriesPointDTO {
    /** Calendar day, "YYYY-MM-DD" */
    date: string;
    value: number;
}

/** One chart: a number read out of the journal (km run, hours slept...) with its daily values */
export interface ReflectSeriesDTO {
    code: string;
    label: string;
    unit: string;
    /** How values of one day combine: sum (amounts), avg (levels) or max */
    aggregate: "sum" | "avg" | "max";
    points: ReflectSeriesPointDTO[];
}

export interface ReflectScanResultDTO {
    scanned: number;
    failed: number;
}

/** The two ways to look at the journal: the table of rows, or the charts of the numbers read out of it */
export type ReflectView = "table" | "charts";

export interface ReflectChartsActions {
    loadStarted: () => void;
    loaded: (series: ReflectSeriesDTO[]) => void;
    loadFailed: () => void;
    scanStarted: () => void;
    scanEnded: (message: string) => void;
}

export interface ReflectChartsState {
    series: ReflectSeriesDTO[];
    isLoading: boolean;
    isScanning: boolean;
    /** Result of the last scan, shown under the Scan now button; empty before any scan */
    scanMessage: string;
    actions: ReflectChartsActions;
}

/** One point as the chart library wants it */
export interface ReflectChartPoint {
    label: string;
    value: number;
}

export interface ReflectViewActions {
    viewChanged: (view: ReflectView) => void;
    tagChanged: (tag: string) => void;
    searchChanged: (text: string) => void;
}

export interface ReflectViewState {
    view: ReflectView;
    /** Empty means every tag */
    tagFilter: string;
    searchText: string;
    actions: ReflectViewActions;
}

/** What every chart shape gets: the points, and the unit and name for the tooltip */
export interface ReflectChartKindProps {
    data: ReflectChartPoint[];
    unit: string;
    label: string;
}
