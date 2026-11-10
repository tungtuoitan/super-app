/**
 * Reflect Store (Zustand) — rows of the journal, the save state, and which rows already exist in the
 * database. Plain state only: saving and loading happen in the hooks.
 */

import { create } from "zustand";
import { createReflectRow } from "@/features/taskDetail";
import type { ReflectState } from "../types/reflect.types";
import { withReflectCreatedAt, withTrailingBlankReflectRow } from "../utils/reflect.utils";

export const useReflectStore = create<ReflectState>((set) => ({
    rows: [],
    saveState: "loading",
    storedIds: new Set(),
    actions: {
        loadStarted: () => set({ saveState: "loading" }),
        loaded: (rows) => set({ rows: withTrailingBlankReflectRow(rows, createReflectRow), storedIds: new Set(rows.map((r) => r.id)), saveState: "idle" }),
        loadFailed: () => set({ saveState: "error" }),
        fieldChanged: ({ rowId, field, value, nowIso }) =>
            set((s) => ({ rows: withTrailingBlankReflectRow(s.rows.map((r) => (r.id === rowId ? withReflectCreatedAt({ ...r, [field]: value }, nowIso) : r)), createReflectRow) })),
        rowAdded: () => set((s) => ({ rows: withTrailingBlankReflectRow(s.rows, createReflectRow) })),
        saveStarted: () => set({ saveState: "saving" }),
        rowStored: (rowId) => set((s) => ({ storedIds: new Set(s.storedIds).add(rowId), saveState: "saved" })),
        rowRemoved: (rowId) =>
            set((s) => {
                const next = new Set(s.storedIds);
                next.delete(rowId);
                return { rows: withTrailingBlankReflectRow(s.rows.filter((r) => r.id !== rowId), createReflectRow), storedIds: next, saveState: "saved" };
            }),
        saveFailed: () => set({ saveState: "error" }),
    },
}));
