/**
 * Workspace Store Context
 * Centralized state management for workspace explorer
 * Manages workspaces and their tree data, folder UI state
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from "react";
import type { WsResponse } from "@/types/workspace.types";
import type { WorkspaceDTO } from "@/types/workspace-dto.types";

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
};

export const WorkspaceStore = createContext<WorkspaceContextData>(workspaceContextDefaultValue);

export const useWorkspaceStore = () => useContext(WorkspaceStore);

export const WorkspaceProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [allWorkspaces, setAllWorkspaces] = useState<WsResponse[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceDTO | null>(null);
    const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(false);
    const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);

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
            }}
        >
            {children}
        </WorkspaceStore.Provider>
    );
};
