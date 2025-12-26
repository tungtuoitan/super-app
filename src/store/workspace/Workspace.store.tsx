/**
 * Workspace Store Context
 * Centralized state management for workspace explorer
 * Manages workspaces and their tree data, folder UI state
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from "react";
import type { WsResponse, WorkspaceWithTreeResponse } from "@/types/workspace.types";

export interface WorkspaceContextData {
    // Workspace state
    allWorkspaces: WsResponse[];
    setAllWorkspaces: Dispatch<SetStateAction<WsResponse[]>>;
    currentTree: WorkspaceWithTreeResponse | null; // Current workspace tree data (contains workspaceId)
    setCurrentTree: Dispatch<SetStateAction<WorkspaceWithTreeResponse | null>>;
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
    selectedFolderIds: number[];
    setSelectedFolderIds: Dispatch<SetStateAction<number[]>>;
    lastSelectedFolderId: number | null;
    setLastSelectedFolderId: Dispatch<SetStateAction<number | null>>;
    isDragging: boolean;
    setIsDragging: Dispatch<SetStateAction<boolean>>;
    _treeRef: React.RefObject<any>;
}

export const workspaceContextDefaultValue: WorkspaceContextData = {
    allWorkspaces: [],
    setAllWorkspaces: () => {},
    currentTree: null,
    setCurrentTree: () => {},
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
    selectedFolderIds: [],
    setSelectedFolderIds: () => {},
    lastSelectedFolderId: null,
    setLastSelectedFolderId: () => {},
    isDragging: false,
    setIsDragging: () => {},
    _treeRef: { current: null },
};

export const WorkspaceStore = createContext<WorkspaceContextData>(workspaceContextDefaultValue);

export const useWorkspaceStore = () => useContext(WorkspaceStore);

export const WorkspaceProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [allWorkspaces, setAllWorkspaces] = useState<WsResponse[]>([]);
    const [currentTree, setCurrentTree] = useState<WorkspaceWithTreeResponse | null>(null);
    const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(false);
    const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);

    // Folder UI state
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
    const [searchText, setSearchText] = useState<string>("");
    const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
    const [lastSelectedFolderId, setLastSelectedFolderId] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const _treeRef = useRef<any>(null);

    return (
        <WorkspaceStore.Provider
            value={{
                allWorkspaces,
                setAllWorkspaces,
                currentTree,
                setCurrentTree,
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
                selectedFolderIds,
                setSelectedFolderIds,
                lastSelectedFolderId,
                setLastSelectedFolderId,
                isDragging,
                setIsDragging,
                _treeRef,
            }}
        >
            {children}
        </WorkspaceStore.Provider>
    );
};
