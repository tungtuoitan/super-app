/**
 * Reflect Store (Zustand) — rows of the journal, the save state, and which rows already exist in the
 * database. Plain state only: saving and loading happen in the hooks.
 */

import { create } from "zustand";
import { createReflectRow } from "@/features/taskDetail";
import type { ReflectState } from "../types/reflect.types";

export const useReflectStore = create<ReflectState>((set) => ({
    rows: [],
    saveState: "loading",
    storedIds: new Set(),
    actions: {
        loadStarted: () => set({ saveState: "loading" }),
        loaded: (rows) => set({ rows, storedIds: new Set(rows.map((r) => r.id)), saveState: "idle" }),
        loadFailed: () => set({ saveState: "error" }),
        fieldChanged: (rowId, field, value) =>
            set((s) => ({ rows: s.rows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)) })),
        rowAdded: () => set((s) => ({ rows: [...s.rows, createReflectRow()] })),
        saveStarted: () => set({ saveState: "saving" }),
        rowStored: (rowId) => set((s) => ({ storedIds: new Set(s.storedIds).add(rowId), saveState: "saved" })),
        rowRemoved: (rowId) =>
            set((s) => {
                const next = new Set(s.storedIds);
                next.delete(rowId);
                return { storedIds: next, saveState: "saved" };
            }),
        saveFailed: () => set({ saveState: "error" }),
    },
}));
