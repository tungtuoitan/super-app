import { useReflectViewStore } from "../store/useReflectView.store";

export const useReflectShowAll = () => useReflectViewStore((s) => s.showAll);
export const useReflectTagFilter = () => useReflectViewStore((s) => s.tagFilter);
export const useReflectSearchText = () => useReflectViewStore((s) => s.searchText);
export const useReflectViewActions = () => useReflectViewStore((s) => s.actions);
