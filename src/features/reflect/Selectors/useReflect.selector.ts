import { useReflectStore } from "../store/useReflect.store";

export const useReflectRows = () => useReflectStore((s) => s.rows);
export const useReflectSaveState = () => useReflectStore((s) => s.saveState);
export const useReflectStoreActions = () => useReflectStore((s) => s.actions);
export const useReflectIsLoading = () => useReflectStore((s) => s.saveState === "loading");
export const useReflectHasError = () => useReflectStore((s) => s.saveState === "error");
