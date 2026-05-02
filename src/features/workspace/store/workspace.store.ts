import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Dispatch, SetStateAction, RefObject } from "react";
import { zSetter } from "@/shared";
import type { WsResponse } from "../types/workspace.types";
import type { WorkspaceDTO } from "../types/workspace-dto.types";
import type { TreeFolder } from "../utils/workspace.tree.utils";

export interface WorkspaceContextData {
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

    selectedRowIds: number[];
    setSelectedRowIds: Dispatch<SetStateAction<number[]>>;
    expandedNodes: Set<number>;
    setExpandedNodes: Dispatch<SetStateAction<Set<number>>>;
    searchText: string;
    setSearchText: Dispatch<SetStateAction<string>>;

    selectedItemIds: number[];
    setSelectedItemIds: Dispatch<SetStateAction<number[]>>;
    lastSelectedItemId: number | null;
    setLastSelectedItemId: Dispatch<SetStateAction<number | null>>;
    isDragging: boolean;
    setIsDragging: Dispatch<SetStateAction<boolean>>;
    _treeRef: RefObject<any>;
    selectedWorkspaceId: number | null;
    setSelectedWorkspaceId: Dispatch<SetStateAction<number | null>>;

    treeContainerRef: RefObject<HTMLDivElement>;
    containerHeight: number;
    setContainerHeight: Dispatch<SetStateAction<number>>;
    dropZoneHeight: number;
    setDropZoneHeight: Dispatch<SetStateAction<number>>;
    treeData: TreeFolder[];
    setTreeData: Dispatch<SetStateAction<TreeFolder[]>>;

    scrollToItem: boolean;
    setScrollToItem: Dispatch<SetStateAction<boolean>>;
}

const _treeRef: RefObject<any> = { current: null };
const _treeContainerRef: RefObject<HTMLDivElement> = { current: null };

const _store = create<WorkspaceContextData>((set, get) => ({
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

    selectedRowIds: [],
    setSelectedRowIds: zSetter("selectedRowIds", set, get),
    expandedNodes: new Set<number>(),
    setExpandedNodes: zSetter("expandedNodes", set, get),
    searchText: "",
    setSearchText: zSetter("searchText", set, get),

    selectedItemIds: [],
    setSelectedItemIds: zSetter("selectedItemIds", set, get),
    lastSelectedItemId: null,
    setLastSelectedItemId: zSetter("lastSelectedItemId", set, get),
    isDragging: false,
    setIsDragging: zSetter("isDragging", set, get),
    _treeRef,
    selectedWorkspaceId: null,
    setSelectedWorkspaceId: zSetter("selectedWorkspaceId", set, get),

    treeContainerRef: _treeContainerRef,
    containerHeight: 800,
    setContainerHeight: zSetter("containerHeight", set, get),
    dropZoneHeight: 0,
    setDropZoneHeight: zSetter("dropZoneHeight", set, get),
    treeData: [],
    setTreeData: zSetter("treeData", set, get),

    scrollToItem: false,
    setScrollToItem: zSetter("scrollToItem", set, get),
}));

export const useWorkspaceStore = () => _store(useShallow((s) => s));
export const getWorkspaceState = () => _store.getState();
export const subscribeWorkspaceState = _store.subscribe;
export const useWorkspaceStoreSlice = _store;
