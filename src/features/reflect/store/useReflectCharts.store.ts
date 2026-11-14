/**
 * Reflect charts store (Zustand) — the numbers read out of the journal, one series per metric.
 * Plain state only: loading and scanning happen in useReflectCharts.helper.
 */

import { create } from "zustand";
import type { ReflectChartsState } from "../types/reflect.types";

export const useReflectChartsStore = create<ReflectChartsState>((set) => ({
    series: [],
    isLoading: false,
    isScanning: false,
    actions: {
        loadStarted: () => set({ isLoading: true }),
        loaded: (series) => set({ series, isLoading: false }),
        loadFailed: () => set({ isLoading: false }),
        scanStarted: () => set({ isScanning: true }),
        scanEnded: () => set({ isScanning: false }),
    },
}));
