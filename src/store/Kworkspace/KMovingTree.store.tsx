import React, { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import type { WorkspaceDTO } from "@/types/workspace-dto.types";
import type { TreeApi } from "react-arborist";
import type { TreeFolder } from "@/hooks/workspace/tree.miniHelper";

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

    // Temporarily highlighted duplicate items (will be cleared after 5s)
    highlightedDuplicateIds: Set<string>;
    setHighlightedDuplicateIds: Dispatch<SetStateAction<Set<string>>>;

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

    // Tree instance ref (react-arborist TreeApi)
    _treeRef: React.RefObject<TreeApi<TreeFolder>>;

    // Force tree re-render after drop operations
    treeRenderKey: number;
    setTreeRenderKey: Dispatch<SetStateAction<number>>;

    dropZoneHeight: number;
    setDropZoneHeight: Dispatch<SetStateAction<number>>;
}

// ========================================
// 2. Context & Default Value
// ========================================

const movingTreeContextDefaultValue: MovingTreeContextData = {
    // Target workspace info
    targetWorkspaceId: null,
    setTargetWorkspaceId: () => {},

    // Temporarily highlighted duplicates
    highlightedDuplicateIds: new Set(),
    setHighlightedDuplicateIds: () => {},

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

    // Tree instance ref
    _treeRef: { current: null },

    // Force tree re-render
    treeRenderKey: 0,
    setTreeRenderKey: () => {},
    dropZoneHeight: 0,
    setDropZoneHeight: () => {},
};

const MovingTreeStore = createContext<MovingTreeContextData>(movingTreeContextDefaultValue);

// ========================================
// 3. Custom Hook
// ========================================

export const KuseMovingTreeStore = (): MovingTreeContextData => {
    const context = useContext(MovingTreeStore);
    if (!context) {
        throw new Error("KuseMovingTreeStore must be used within MovingTreeProvider");
    }
    return context;
};

// ========================================
// 4. Provider Component
// ========================================

export const MovingTreeProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Target workspace info
    const [targetWorkspaceId, setTargetWorkspaceId] = useState<number | null>(null);

    // Temporarily highlighted duplicates (cleared after 5s)
    const [highlightedDuplicateIds, setHighlightedDuplicateIds] = useState<Set<string>>(new Set());

    // Loading state
    const [isLoadingTargetTree, setIsLoadingTargetTree] = useState<boolean>(false);

    // Target workspace tree data
    const [targetWorkspace, setTargetWorkspace] = useState<WorkspaceDTO | null>(null);

    // Tree container ref and height
    const treeContainerRef = React.useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState<number>(500);

    // Tree instance ref
    const _treeRef = React.useRef<TreeApi<TreeFolder>>(null);

    // Force tree re-render
    const [treeRenderKey, setTreeRenderKey] = useState<number>(0);
    const [dropZoneHeight, setDropZoneHeight] = React.useState(0);

    return (
        <MovingTreeStore.Provider
            value={{
                // Target workspace info
                targetWorkspaceId,
                setTargetWorkspaceId,

                // Temporarily highlighted duplicates
                highlightedDuplicateIds,
                setHighlightedDuplicateIds,

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

                // Tree instance ref
                _treeRef,

                // Force tree re-render
                treeRenderKey,
                setTreeRenderKey,

                dropZoneHeight,
                setDropZoneHeight,
            }}
        >
            {children}
        </MovingTreeStore.Provider>
    );
};
