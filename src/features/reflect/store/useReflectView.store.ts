/**
 * Reflect view store (Zustand) — how the journal is looked at: table or charts, the tag it is narrowed to,
 * and the text typed in the search box. Plain state only; the filtering itself is in useReflectJournal.helper.
 */

import { create } from "zustand";
import type { ReflectViewState } from "../types/reflect.types";

export const useReflectViewStore = create<ReflectViewState>((set) => ({
    view: "table",
    tagFilter: "",
    searchText: "",
    actions: {
        viewChanged: (view) => set({ view }),
        tagChanged: (tagFilter) => set({ tagFilter }),
        searchChanged: (searchText) => set({ searchText }),
    },
}));
