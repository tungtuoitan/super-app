/**
 * Reflect view store (Zustand) — how the journal is looked at: every row or only the ones worth reading, the tag it is narrowed to,
 * and the text typed in the search box. Plain state only; the filtering itself is in useReflectJournal.helper.
 */

import { create } from "zustand";
import type { ReflectViewState } from "../types/reflect.types";

export const useReflectViewStore = create<ReflectViewState>((set) => ({
    showAll: false,
    tagFilter: "",
    searchText: "",
    actions: {
        showAllToggled: () => set((s) => ({ showAll: !s.showAll })),
        tagChanged: (tagFilter) => set({ tagFilter }),
        searchChanged: (searchText) => set({ searchText }),
    },
}));
