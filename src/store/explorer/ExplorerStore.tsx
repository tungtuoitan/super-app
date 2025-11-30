/**
 * Explorer Store Context
 * Centralized state management for workspace explorer
 * Manages workspaces and their tree data
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from 'react';
import type { WorkspaceListResponse, WorkspaceWithTreeResponse } from '@/types/workspace.types';

export interface ExplorerContextData {
    allWorkspaces: WorkspaceListResponse[];
    setAllWorkspaces: Dispatch<SetStateAction<WorkspaceListResponse[]>>;
    currentTrees: Map<number, WorkspaceWithTreeResponse>; // workspaceId -> tree data
    setCurrentTrees: Dispatch<SetStateAction<Map<number, WorkspaceWithTreeResponse>>>;
    selectedWorkspaceId: number | null;
    setSelectedWorkspaceId: Dispatch<SetStateAction<number | null>>;
    isLoadingWorkspaces: boolean;
    setIsLoadingWorkspaces: Dispatch<SetStateAction<boolean>>;
    isLoadingTree: boolean;
    setIsLoadingTree: Dispatch<SetStateAction<boolean>>;
}

export const explorerContextDefaultValue: ExplorerContextData = {
    allWorkspaces: [],
    setAllWorkspaces: () => {},
    currentTrees: new Map(),
    setCurrentTrees: () => {},
    selectedWorkspaceId: null,
    setSelectedWorkspaceId: () => {},
    isLoadingWorkspaces: false,
    setIsLoadingWorkspaces: () => {},
    isLoadingTree: false,
    setIsLoadingTree: () => {},
};

export const ExplorerStore = createContext<ExplorerContextData>(explorerContextDefaultValue);

export const useExplorerStore = () => useContext(ExplorerStore);

export const ExplorerProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceListResponse[]>([]);
    const [currentTrees, setCurrentTrees] = useState<Map<number, WorkspaceWithTreeResponse>>(new Map());
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
    const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(false);
    const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);

    return (
        <ExplorerStore.Provider
            value={{
                allWorkspaces,
                setAllWorkspaces,
                currentTrees,
                setCurrentTrees,
                selectedWorkspaceId,
                setSelectedWorkspaceId,
                isLoadingWorkspaces,
                setIsLoadingWorkspaces,
                isLoadingTree,
                setIsLoadingTree,
            }}
        >
            {children}
        </ExplorerStore.Provider>
    );
};
