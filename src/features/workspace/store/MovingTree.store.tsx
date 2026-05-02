import React, { createContext, Dispatch, SetStateAction, useContext, useState } from "react";
import type { WorkspaceDTO } from "../types/workspace-dto.types";
import type { TreeApi } from "react-arborist";
import type { TreeFolder } from "../utils/workspace.tree.utils";

export interface MovingTreeContextData {
    targetWorkspaceId: number | null;
    setTargetWorkspaceId: Dispatch<SetStateAction<number | null>>;
    highlightedDuplicateIds: Set<string>;
    setHighlightedDuplicateIds: Dispatch<SetStateAction<Set<string>>>;
    isLoadingTargetTree: boolean;
    setIsLoadingTargetTree: Dispatch<SetStateAction<boolean>>;
    targetWorkspace: WorkspaceDTO | null;
    setTargetWorkspace: Dispatch<SetStateAction<WorkspaceDTO | null>>;
    treeContainerRef: React.RefObject<HTMLDivElement>;
    containerHeight: number;
    setContainerHeight: Dispatch<SetStateAction<number>>;
    _treeRef: React.RefObject<TreeApi<TreeFolder>>;
    treeRenderKey: number;
    setTreeRenderKey: Dispatch<SetStateAction<number>>;
    dropZoneHeight: number;
    setDropZoneHeight: Dispatch<SetStateAction<number>>;
}

const movingTreeContextDefaultValue: MovingTreeContextData = {
    targetWorkspaceId: null, setTargetWorkspaceId: () => {},
    highlightedDuplicateIds: new Set(), setHighlightedDuplicateIds: () => {},
    isLoadingTargetTree: false, setIsLoadingTargetTree: () => {},
    targetWorkspace: null, setTargetWorkspace: () => {},
    treeContainerRef: { current: null }, containerHeight: 500, setContainerHeight: () => {},
    _treeRef: { current: null },
    treeRenderKey: 0, setTreeRenderKey: () => {},
    dropZoneHeight: 0, setDropZoneHeight: () => {},
};

const MovingTreeStore = createContext<MovingTreeContextData>(movingTreeContextDefaultValue);

export const useMovingTreeStore = (): MovingTreeContextData => {
    const context = useContext(MovingTreeStore);
    if (!context) throw new Error("useMovingTreeStore must be used within MovingTreeProvider");
    return context;
};

export const MovingTreeProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [targetWorkspaceId, setTargetWorkspaceId] = useState<number | null>(null);
    const [highlightedDuplicateIds, setHighlightedDuplicateIds] = useState<Set<string>>(new Set());
    const [isLoadingTargetTree, setIsLoadingTargetTree] = useState<boolean>(false);
    const [targetWorkspace, setTargetWorkspace] = useState<WorkspaceDTO | null>(null);
    const treeContainerRef = React.useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState<number>(500);
    const _treeRef = React.useRef<TreeApi<TreeFolder>>(null);
    const [treeRenderKey, setTreeRenderKey] = useState<number>(0);
    const [dropZoneHeight, setDropZoneHeight] = React.useState(0);

    return (
        <MovingTreeStore.Provider
            value={{
                targetWorkspaceId, setTargetWorkspaceId,
                highlightedDuplicateIds, setHighlightedDuplicateIds,
                isLoadingTargetTree, setIsLoadingTargetTree,
                targetWorkspace, setTargetWorkspace,
                treeContainerRef, containerHeight, setContainerHeight,
                _treeRef,
                treeRenderKey, setTreeRenderKey,
                dropZoneHeight, setDropZoneHeight,
            }}
        >
            {children}
        </MovingTreeStore.Provider>
    );
};
