/**
 * Workspace Store Context
 * Centralized state management for workspace explorer
 * Manages workspaces and their tree data, folder UI state
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from "react";
import type { WsResponse } from "../types/workspace.types";
import type { WorkspaceDTO } from "../types/workspace-dto.types";
import type { TreeFolder } from "../hooks/tree.miniHelper";

export interface WorkspaceContextData {
    // Workspace state
    allWorkspaces: WsResponse[];
    setAllWorkspaces: Dispatch<SetStateAction<WsResponse[]>>;
    currentWorkspace: WorkspaceDTO | null; // Current workspace tree data (unified WorkspaceDTO)
    setCurrentWorkspace: Dispatch<SetStateAction<WorkspaceDTO | null>>;
    isLoadingWorkspaces: boolean;
    setIsLoadingWorkspaces: Dispatch<SetStateAction<boolean>>;
    isLoadingTree: boolean;
    setIsLoadingTree: Dispatch<SetStateAction<boolean>>;
    isLoadingTreeByOpeningFolder: boolean;
    setIsLoadingTreeByOpeningFolder: Dispatch<SetStateAction<boolean>>;

    // Folder UI state (workspace folder UI, selection)
    selectedRowIds: number[];
    setSelectedRowIds: Dispatch<SetStateAction<number[]>>;
    expandedNodes: Set<number>;
    setExpandedNodes: Dispatch<SetStateAction<Set<number>>>;
    searchText: string;
    setSearchText: Dispatch<SetStateAction<string>>;

    // Tree item selection (folders, notes, files)
    // IMPORTANT: Stores workspace_items.id (NOT entity IDs!)
    // workspace_items.id is unique across all types, no collision possible
    selectedItemIds: number[]; // workspace_items.id[]
    setSelectedItemIds: Dispatch<SetStateAction<number[]>>;
    lastSelectedItemId: number | null; // workspace_items.id
    setLastSelectedItemId: Dispatch<SetStateAction<number | null>>;
    isDragging: boolean;
    setIsDragging: Dispatch<SetStateAction<boolean>>;
    _treeRef: React.RefObject<any>;
    selectedWorkspaceId: number | null;
    setSelectedWorkspaceId: Dispatch<SetStateAction<number | null>>;

    // WorkspaceTree state for height calculations and drop zone
    treeContainerRef: React.RefObject<HTMLDivElement>;
    containerHeight: number;
    setContainerHeight: Dispatch<SetStateAction<number>>;
    dropZoneHeight: number;
    setDropZoneHeight: Dispatch<SetStateAction<number>>;
    treeData: TreeFolder[];
    setTreeData: Dispatch<SetStateAction<TreeFolder[]>>;

    // Highlight state (for navigation from other views)
    scrollToItem: boolean; // workspace_items.id to highlight
    setScrollToItem: Dispatch<SetStateAction<boolean>>;
}

export const workspaceContextDefaultValue: WorkspaceContextData = {
    allWorkspaces: [],
    setAllWorkspaces: () => {},
    currentWorkspace: null,
    setCurrentWorkspace: () => {},
    isLoadingWorkspaces: false,
    setIsLoadingWorkspaces: () => {},
    isLoadingTree: false,
    setIsLoadingTree: () => {},
    isLoadingTreeByOpeningFolder: false,
    setIsLoadingTreeByOpeningFolder: () => {},


    selectedRowIds: [],
    setSelectedRowIds: () => {},
    expandedNodes: new Set(),
    setExpandedNodes: () => {},
    searchText: "",
    setSearchText: () => {},
    selectedItemIds: [],
    setSelectedItemIds: () => {},
    lastSelectedItemId: null,
    setLastSelectedItemId: () => {},
    isDragging: false,
    setIsDragging: () => {},
    _treeRef: { current: null },
    selectedWorkspaceId: null,
    setSelectedWorkspaceId: () => {},

    // WorkspaceTree state defaults
    treeContainerRef: { current: null },
    containerHeight: 800,
    setContainerHeight: () => {},
    dropZoneHeight: 0,
    setDropZoneHeight: () => {},
    treeData: [],
    setTreeData: () => {},

    // Highlight state defaults
    scrollToItem: false,
    setScrollToItem: () => {},
};

export const WorkspaceStore = createContext<WorkspaceContextData>(workspaceContextDefaultValue);

export const useWorkspaceStore = () => useContext(WorkspaceStore);

export const WorkspaceProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [allWorkspaces, setAllWorkspaces] = useState<WsResponse[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceDTO | null>(null);
    const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(false);
    const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false); // loading này dùng cho tree khi đang load toàn bộ tree
    const [isLoadingTreeByOpeningFolder, setIsLoadingTreeByOpeningFolder] = useState<boolean>(false); // loading này dùng cho tree khi đang mở rộng folder

    // Folder UI state
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
    const [searchText, setSearchText] = useState<string>("");

    // Tree item selection (stores entity IDs: folders.id | notes.id | files.id)
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [lastSelectedItemId, setLastSelectedItemId] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const _treeRef = useRef<any>(null);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
    
    // WorkspaceTree state
    const treeContainerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState<number>(800);
    const [dropZoneHeight, setDropZoneHeight] = useState<number>(0);
    const [treeData, setTreeData] = useState<TreeFolder[]>([]);

    // Highlight state
    const [scrollToItem, setScrollToItem] = useState<boolean>(false);

    return (
        <WorkspaceStore.Provider
            value={{
                allWorkspaces,
                setAllWorkspaces,
                currentWorkspace,
                setCurrentWorkspace,
                isLoadingWorkspaces,
                setIsLoadingWorkspaces,
                isLoadingTree,
                setIsLoadingTree,
                isLoadingTreeByOpeningFolder,
                setIsLoadingTreeByOpeningFolder,



                selectedRowIds,
                setSelectedRowIds,
                expandedNodes,
                setExpandedNodes,
                searchText,
                setSearchText,
                selectedItemIds,
                setSelectedItemIds,
                lastSelectedItemId,
                setLastSelectedItemId,
                isDragging,
                setIsDragging,
                _treeRef,
                selectedWorkspaceId,
                setSelectedWorkspaceId,

                // WorkspaceTree state
                treeContainerRef,
                containerHeight,
                setContainerHeight,
                dropZoneHeight,
                setDropZoneHeight,
                treeData,
                setTreeData,

                // Highlight state
                scrollToItem,
                setScrollToItem,
            }}
        >
            {children}
        </WorkspaceStore.Provider>
    );
};
