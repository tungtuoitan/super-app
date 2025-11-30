/**
 * Explorer Store Context
 * Centralized state management for workspace explorer
 * Manages workspaces and their tree data, folder UI state
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from 'react';
import type { WorkspaceListResponse, WorkspaceWithTreeResponse } from '@/types/workspace.types';
import type { Folder, FolderLayoutType } from '@/types/folder.types';

export interface ExplorerContextData {
    // Workspace state
    allWorkspaces: WorkspaceListResponse[];
    setAllWorkspaces: Dispatch<SetStateAction<WorkspaceListResponse[]>>;
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
    treeRef: React.RefObject<any> | null;
    setTreeRef: (ref: React.RefObject<any> | null) => void;
}

export const explorerContextDefaultValue: ExplorerContextData = {
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
    searchText: '',
    setSearchText: () => {},
    selectedFolderIds: [],
    setSelectedFolderIds: () => {},
    lastSelectedFolderId: null,
    setLastSelectedFolderId: () => {},
    isDragging: false,
    setIsDragging: () => {},
    treeRef: null,
    setTreeRef: () => {},
};

export const ExplorerStore = createContext<ExplorerContextData>(explorerContextDefaultValue);

export const useExplorerStore = () => useContext(ExplorerStore);

export const ExplorerProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceListResponse[]>([]);
    const [currentTree, setCurrentTree] = useState<WorkspaceWithTreeResponse | null>(null);
    const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(false);
    const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
    
    // Folder UI state
    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
    const [searchText, setSearchText] = useState<string>('');
    const [selectedFolderIds, setSelectedFolderIds] = useState<number[]>([]);
    const [lastSelectedFolderId, setLastSelectedFolderId] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [treeRef, setTreeRef] = useState<React.RefObject<any> | null>(null);

    return (
        <ExplorerStore.Provider
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
                treeRef,
                setTreeRef,
            }}
        >
            {children}
        </ExplorerStore.Provider>
    );
};
