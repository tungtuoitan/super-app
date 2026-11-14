import { useReflectChartsStore } from "../store/useReflectCharts.store";

export const useReflectSeriesList = () => useReflectChartsStore((s) => s.series);
export const useReflectSeriesByCode = (code: string) => useReflectChartsStore((s) => s.series.find((x) => x.code === code));
export const useReflectChartsIsLoading = () => useReflectChartsStore((s) => s.isLoading);
export const useReflectChartsIsScanning = () => useReflectChartsStore((s) => s.isScanning);
export const useReflectChartsActions = () => useReflectChartsStore((s) => s.actions);
