/**
 * Editor Tab Store (Zustand)
 *
 * Centralized state for all editor tabs (note, workspace, project, task, etc.).
 *
 * Migrated from React Context → Zustand to enable imperative access from
 * outside React (module registry handlers can call `getEditorTabBarState()`
 * synchronously without being inside a component).
 *
 * Public API is intentionally unchanged from the Context version:
 *   const { openTabs, setOpenTabs, activeTabId, ... } = useEditorTabBarStore();
 *
 * Setters mimic React's `Dispatch<SetStateAction<T>>` so existing
 * `setOpenTabs(prev => ...)` and `setOpenTabs(arr)` call sites work as-is.
 *
 * Refs (`editorAreaRef`, `dragCounterRef`) are stored as module-level mutable
 * objects — they never trigger re-renders, just like the React refs they
 * replace.
 */

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Dispatch, SetStateAction, RefObject, MutableRefObject } from "react";
import { zSetter } from "@/shared";
import type { BaseTab } from "../types/tab.types";

// ── Public state shape (matches the old Context contract exactly) ──────────────

export interface EditorTabBarContextData {
    openTabs: BaseTab[];
    setOpenTabs: Dispatch<SetStateAction<BaseTab[]>>;
    activeTabId: string | null;
    setActiveTabId: Dispatch<SetStateAction<string | null>>;
    confirmCloseTabId: string | null;
    setConfirmCloseTabId: Dispatch<SetStateAction<string | null>>;
    isLoadingTabs: boolean;
    setIsLoadingTabs: Dispatch<SetStateAction<boolean>>;
    editorAreaRef?: RefObject<HTMLDivElement>;
    draggedTabId: string | null;
    setDraggedTabId: Dispatch<SetStateAction<string | null>>;
    dragOverTabId: string | null;
    setDragOverTabId: Dispatch<SetStateAction<string | null>>;
    dragOverPosition: "left" | "right" | null;
    setDragOverPosition: Dispatch<SetStateAction<"left" | "right" | null>>;
    dragCounterRef: MutableRefObject<number>;
    isLoadingTab: boolean;
    setIsLoadingTab: Dispatch<SetStateAction<boolean>>;
    isSaving: boolean;
    setIsSaving: Dispatch<SetStateAction<boolean>>;
}

// ── Module-level refs (stable, do not participate in re-renders) ───────────────

const _editorAreaRef: RefObject<HTMLDivElement> = { current: null };
const _dragCounterRef: MutableRefObject<number> = { current: 0 };

// ── Internal Zustand store ─────────────────────────────────────────────────────

const _store = create<EditorTabBarContextData>((set, get) => ({
    openTabs: [],
    setOpenTabs: zSetter("openTabs", set, get),
    activeTabId: null,
    setActiveTabId: zSetter("activeTabId", set, get),
    confirmCloseTabId: null,
    setConfirmCloseTabId: zSetter("confirmCloseTabId", set, get),
    isLoadingTabs: false,
    setIsLoadingTabs: zSetter("isLoadingTabs", set, get),
    editorAreaRef: _editorAreaRef,
    draggedTabId: null,
    setDraggedTabId: zSetter("draggedTabId", set, get),
    dragOverTabId: null,
    setDragOverTabId: zSetter("dragOverTabId", set, get),
    dragOverPosition: null,
    setDragOverPosition: zSetter("dragOverPosition", set, get),
    dragCounterRef: _dragCounterRef,
    isLoadingTab: false,
    setIsLoadingTab: zSetter("isLoadingTab", set, get),
    isSaving: false,
    setIsSaving: zSetter("isSaving", set, get),
}));

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * React hook — returns the entire store snapshot, shallow-compared.
 * Re-renders the calling component when any top-level field changes.
 * Existing destructure usage continues to work unchanged.
 */
export const useEditorTabBarStore = () => _store(useShallow((s) => s));

/** Imperative accessor — read state from outside React. */
export const getEditorTabBarState = () => _store.getState();

/** Imperative subscribe — listen to state changes outside React. */
export const subscribeEditorTabBarState = _store.subscribe;

/**
 * Raw store — escape hatch for slice subscriptions:
 *   const openTabs = useEditorTabBarStoreSlice(s => s.openTabs);
 */
export const useEditorTabBarStoreSlice = _store;
