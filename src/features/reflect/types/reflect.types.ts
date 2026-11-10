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
