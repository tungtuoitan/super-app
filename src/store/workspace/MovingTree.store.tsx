import React, { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import type { WorkspaceDTO } from "@/types/workspace-dto.types";

/**
 * MoveToWorkspacePopup Store - Manages state for "Moving" tab in VSPanel
 * Used for cross-workspace drag & drop operations
 */

// ========================================
// 1. Context Data Interface
// ========================================

export interface MovingTreeContextData {
    // Target workspace info
    targetWorkspaceId: number | null;
    setTargetWorkspaceId: Dispatch<SetStateAction<number | null>>;

    // Target folder info (workspace_items.id of folder in target workspace, null = root)
    targetFolderId: number | null;
    setTargetFolderId: Dispatch<SetStateAction<number | null>>;

    // Duplicate items (entityIds that already exist in target workspace)
    duplicateEntityIds: Set<number>;
    setDuplicateEntityIds: Dispatch<SetStateAction<Set<number>>>;

    // Loading state
    isLoadingTargetTree: boolean;
    setIsLoadingTargetTree: Dispatch<SetStateAction<boolean>>;

    // Target workspace tree data
    targetWorkspace: WorkspaceDTO | null;
    setTargetWorkspace: Dispatch<SetStateAction<WorkspaceDTO | null>>;

    // Tree container ref and height for responsive layout
    treeContainerRef: React.RefObject<HTMLDivElement>;
    containerHeight: number;
    setContainerHeight: Dispatch<SetStateAction<number>>;
}

// ========================================
// 2. Context & Default Value
// ========================================

const movingTreeContextDefaultValue: MovingTreeContextData = {
    // Target workspace info
    targetWorkspaceId: null,
    setTargetWorkspaceId: () => {},

    // Target folder info
    targetFolderId: null,
    setTargetFolderId: () => {},

    // Duplicate items
    duplicateEntityIds: new Set(),
    setDuplicateEntityIds: () => {},

    // Loading state
    isLoadingTargetTree: false,
    setIsLoadingTargetTree: () => {},

    // Target workspace tree data
    targetWorkspace: null,
    setTargetWorkspace: () => {},

    // Tree container ref and height
    treeContainerRef: { current: null },
    containerHeight: 500,
    setContainerHeight: () => {},
};

const MovingTreeStore = createContext<MovingTreeContextData>(movingTreeContextDefaultValue);

// ========================================
// 3. Custom Hook
// ========================================

export const useMovingTreeStore = (): MovingTreeContextData => {
    const context = useContext(MovingTreeStore);
    if (!context) {
        throw new Error("useMovingTreeStore must be used within MovingTreeProvider");
    }
    return context;
};

// ========================================
// 4. Provider Component
// ========================================

export const MovingTreeProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Target workspace info
    const [targetWorkspaceId, setTargetWorkspaceId] = useState<number | null>(null);

    // Target folder info
    const [targetFolderId, setTargetFolderId] = useState<number | null>(null);

    // Duplicate items
    const [duplicateEntityIds, setDuplicateEntityIds] = useState<Set<number>>(new Set());

    // Loading state
    const [isLoadingTargetTree, setIsLoadingTargetTree] = useState<boolean>(false);

    // Target workspace tree data
    const [targetWorkspace, setTargetWorkspace] = useState<WorkspaceDTO | null>(null);

    // Tree container ref and height
    const treeContainerRef = React.useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState<number>(500);

    return (
        <MovingTreeStore.Provider
            value={{
                // Target workspace info
                targetWorkspaceId,
                setTargetWorkspaceId,

                // Target folder info
                targetFolderId,
                setTargetFolderId,

                // Duplicate items
                duplicateEntityIds,
                setDuplicateEntityIds,

                // Loading state
                isLoadingTargetTree,
                setIsLoadingTargetTree,

                // Target workspace tree data
                targetWorkspace,
                setTargetWorkspace,

                // Tree container ref and height
                treeContainerRef,
                containerHeight,
                setContainerHeight,
            }}
        >
            {children}
        </MovingTreeStore.Provider>
    );
};
