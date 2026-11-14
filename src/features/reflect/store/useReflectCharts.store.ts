/**
 * Reflect charts store (Zustand) — the things read out of the journal, one series per metric.
 * Plain state only: loading happens in useReflectCharts.helper.
 */

import { create } from "zustand";
import type { ReflectChartsState } from "../types/reflect.types";

export const useReflectChartsStore = create<ReflectChartsState>((set) => ({
    series: [],
    isLoading: false,
    actions: {
        loadStarted: () => set({ isLoading: true }),
        loaded: (series) => set({ series, isLoading: false }),
        loadFailed: () => set({ isLoading: false }),
    },
}));
