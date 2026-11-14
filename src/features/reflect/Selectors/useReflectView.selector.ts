import { useReflectViewStore } from "../store/useReflectView.store";

export const useReflectViewName = () => useReflectViewStore((s) => s.view);
export const useReflectTagFilter = () => useReflectViewStore((s) => s.tagFilter);
export const useReflectSearchText = () => useReflectViewStore((s) => s.searchText);
export const useReflectViewActions = () => useReflectViewStore((s) => s.actions);
