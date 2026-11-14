import { useAuthStore } from "@/shared";
import { reflectConstants } from "../reflect.constants";
import { useReflectStore } from "../store/useReflect.store";

export const useReflectRows = () => useReflectStore((s) => s.rows);
export const useReflectSaveState = () => useReflectStore((s) => s.saveState);
export const useReflectStoreActions = () => useReflectStore((s) => s.actions);
export const useReflectIsLoading = () => useReflectStore((s) => s.saveState === "loading");
export const useReflectHasError = () => useReflectStore((s) => s.saveState === "error");

/** The saved Created Date filter ("YYYY-MM,YYYY-MM") of the user; empty when no filter is set */
export const useReflectCreatedAtFilter = () => useAuthStore().$user.filters?.[reflectConstants.filterViewKey]?.createdAt;
export const useReflectLoadedIds = () => useReflectStore((s) => s.loadedIds);
