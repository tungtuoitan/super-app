/**
 * Workspace Store (Zustand)
 *
 * Centralized state for workspace explorer (tree data, folder UI, selection).
 *
 * Migrated from React Context → Zustand to enable imperative access from
 * outside React (e.g. module registry handlers can call
 * `useWorkspaceStore.getState()` synchronously without being inside a
 * component).
 *
 * Public API is intentionally unchanged from the Context version:
 *   const { currentWorkspace, setSelectedItemIds, ... } = useWorkspaceStore();
 *
 * Setters mimic React's `Dispatch<SetStateAction<T>>` so existing call sites
 * (`setX(prev => ...)` and `setX(value)`) work as-is.
 *
 * Refs (`_treeRef`, `treeContainerRef`) are stored as module-level mutable
 * objects rather than Zustand state — they never trigger re-renders.
 */

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Dispatch, SetStateAction, RefObject } from "react";
import { zSetter } from "@/shared";
import type { WsResponse } from "../types/workspace.types";
import type { WorkspaceDTO } from "../types/workspace-dto.types";
import type { TreeFolder } from "../hooks/tree.miniHelper";

// ── Public state shape (matches the old Context contract exactly) ──────────────

export interface WorkspaceContextData {
    // Workspace state
    allWorkspaces: WsResponse[];
    setAllWorkspaces: Dispatch<SetStateAction<WsResponse[]>>;
    currentWorkspace: WorkspaceDTO | null;
    setCurrentWorkspace: Dispatch<SetStateAction<WorkspaceDTO | null>>;
    isLoadingWorkspaces: boolean;
    setIsLoadingWorkspaces: Dispatch<SetStateAction<boolean>>;
    isLoadingTree: boolean;
    setIsLoadingTree: Dispatch<SetStateAction<boolean>>;
    isLoadingTreeByOpeningFolder: boolean;
    setIsLoadingTreeByOpeningFolder: Dispatch<SetStateAction<boolean>>;

    // Folder UI state
    selectedRowIds: number[];
    setSelectedRowIds: Dispatch<SetStateAction<number[]>>;
    expandedNodes: Set<number>;
    setExpandedNodes: Dispatch<SetStateAction<Set<number>>>;
    searchText: string;
    setSearchText: Dispatch<SetStateAction<string>>;

    // Tree item selection — stores workspace_items.id (NOT entity IDs)
    selectedItemIds: number[];
    setSelectedItemIds: Dispatch<SetStateAction<number[]>>;
    lastSelectedItemId: number | null;
    setLastSelectedItemId: Dispatch<SetStateAction<number | null>>;
    isDragging: boolean;
    setIsDragging: Dispatch<SetStateAction<boolean>>;
    _treeRef: RefObject<any>;
    selectedWorkspaceId: number | null;
    setSelectedWorkspaceId: Dispatch<SetStateAction<number | null>>;

    // WorkspaceTree state for height calculations and drop zone
    treeContainerRef: RefObject<HTMLDivElement>;
    containerHeight: number;
    setContainerHeight: Dispatch<SetStateAction<number>>;
    dropZoneHeight: number;
    setDropZoneHeight: Dispatch<SetStateAction<number>>;
    treeData: TreeFolder[];
    setTreeData: Dispatch<SetStateAction<TreeFolder[]>>;

    // Highlight state (for navigation from other views)
    scrollToItem: boolean;
    setScrollToItem: Dispatch<SetStateAction<boolean>>;
}

// ── Module-level refs (stable, do not participate in re-renders) ───────────────

const _treeRef: RefObject<any> = { current: null };
const _treeContainerRef: RefObject<HTMLDivElement> = { current: null };

// ── Internal Zustand store ─────────────────────────────────────────────────────

const _store = create<WorkspaceContextData>((set, get) => ({
    // Workspace state
    allWorkspaces: [],
    setAllWorkspaces: zSetter("allWorkspaces", set, get),
    currentWorkspace: null,
    setCurrentWorkspace: zSetter("currentWorkspace", set, get),
    isLoadingWorkspaces: false,
    setIsLoadingWorkspaces: zSetter("isLoadingWorkspaces", set, get),
    isLoadingTree: false,
    setIsLoadingTree: zSetter("isLoadingTree", set, get),
    isLoadingTreeByOpeningFolder: false,
    setIsLoadingTreeByOpeningFolder: zSetter("isLoadingTreeByOpeningFolder", set, get),

    // Folder UI state
    selectedRowIds: [],
    setSelectedRowIds: zSetter("selectedRowIds", set, get),
    expandedNodes: new Set<number>(),
    setExpandedNodes: zSetter("expandedNodes", set, get),
    searchText: "",
    setSearchText: zSetter("searchText", set, get),

    // Tree item selection
    selectedItemIds: [],
    setSelectedItemIds: zSetter("selectedItemIds", set, get),
    lastSelectedItemId: null,
    setLastSelectedItemId: zSetter("lastSelectedItemId", set, get),
    isDragging: false,
    setIsDragging: zSetter("isDragging", set, get),
    _treeRef,
    selectedWorkspaceId: null,
    setSelectedWorkspaceId: zSetter("selectedWorkspaceId", set, get),

    // WorkspaceTree state
    treeContainerRef: _treeContainerRef,
    containerHeight: 800,
    setContainerHeight: zSetter("containerHeight", set, get),
    dropZoneHeight: 0,
    setDropZoneHeight: zSetter("dropZoneHeight", set, get),
    treeData: [],
    setTreeData: zSetter("treeData", set, get),

    // Highlight state
    scrollToItem: false,
    setScrollToItem: zSetter("scrollToItem", set, get),
}));

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * React hook — returns the entire store snapshot, shallow-compared.
 * Re-renders the calling component when any top-level field changes,
 * matching the previous React Context behaviour exactly.
 */
export const useWorkspaceStore = () => _store(useShallow((s) => s));

/**
 * Imperative accessor — read the current state from outside React
 * (module registry handlers, event listeners, etc.).
 */
export const getWorkspaceState = () => _store.getState();

/**
 * Imperative subscribe — listen to state changes outside React.
 */
export const subscribeWorkspaceState = _store.subscribe;

/**
 * Raw store — escape hatch for slice subscriptions.
 *   const ids = useWorkspaceStoreSlice(s => s.selectedItemIds);
 */
export const useWorkspaceStoreSlice = _store;

// Backwards-compat: WorkspaceProvider is no longer needed (Zustand has no
// Provider). Existing call sites should use `useWorkspaceStore()` directly.
