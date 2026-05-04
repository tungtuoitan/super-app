import type { Dispatch, SetStateAction } from "react";
import type { KWsResponse } from "./K.types";
import type { KDTO } from "./K-dto.types";
import type { KTreeNode } from "../hooks/kTree/Ktree.miniHelper";

/** Question cut/paste clipboard — persists across node navigation */
export interface KFlowClipboard {
    questionIds: number[];
    sourceNodeId: number | null; // null = orphan
}

export interface KContextData {
    // K list state
    allK: KWsResponse[];
    setAllK: Dispatch<SetStateAction<KWsResponse[]>>;
    currentK: KDTO | null;
    setCurrentK: Dispatch<SetStateAction<KDTO | null>>;
    isLoadingK: boolean;
    setIsLoadingK: Dispatch<SetStateAction<boolean>>;
    isLoadingTree: boolean;
    setIsLoadingTree: Dispatch<SetStateAction<boolean>>;
    isLoadingTreeByOpeningNode: boolean;
    setIsLoadingTreeByOpeningNode: Dispatch<SetStateAction<boolean>>;

    // Tree UI state
    selectedRowIds: number[];
    setSelectedRowIds: Dispatch<SetStateAction<number[]>>;
    expandedNodes: Set<number>;
    setExpandedNodes: Dispatch<SetStateAction<Set<number>>>;
    searchText: string;
    setSearchText: Dispatch<SetStateAction<string>>;

    // Tree item selection — stores k_items.id
    selectedItemIds: number[];
    setSelectedItemIds: Dispatch<SetStateAction<number[]>>;
    lastSelectedItemId: number | null;
    setLastSelectedItemId: Dispatch<SetStateAction<number | null>>;
    isDragging: boolean;
    setIsDragging: Dispatch<SetStateAction<boolean>>;
    _treeRef: React.RefObject<any>;
    selectedKId: number | null;
    setSelectedKId: Dispatch<SetStateAction<number | null>>;

    // Tree container & drop zone
    treeContainerRef: React.RefObject<HTMLDivElement>;
    containerHeight: number;
    setContainerHeight: Dispatch<SetStateAction<number>>;
    dropZoneHeight: number;
    setDropZoneHeight: Dispatch<SetStateAction<number>>;
    treeData: KTreeNode[];
    setTreeData: Dispatch<SetStateAction<KTreeNode[]>>;

    // Navigation highlight
    scrollToItem: boolean;
    setScrollToItem: Dispatch<SetStateAction<boolean>>;

    // Cross-panel hover sync
    hoveredNodeId: number | null;
    setHoveredNodeId: Dispatch<SetStateAction<number | null>>;

    // Tree mark — highlight a subtree (node + descendants)
    markedNodeId: number | null;
    setMarkedNodeId: Dispatch<SetStateAction<number | null>>;

    /**
     * Pending markdown import — set by KNodeMenu right-click.
     * undefined  = no pending import
     * null       = pending import, parent = root
     * number     = pending import, parent = that node id
     */
    pendingImportNodeId: number | null | undefined;
    setPendingImportNodeId: Dispatch<SetStateAction<number | null | undefined>>;

    /**
     * Pending quiz tab switch — set by node click in tree.
     * undefined  = no pending switch
     * number     = switch to quiz tab (value = clicked node id)
     */
    pendingQuizTabSwitch: number | null | undefined;
    setPendingQuizTabSwitch: Dispatch<SetStateAction<number | null | undefined>>;

    /** Latest quiz score per question nodeId (nodeType="question") */
    nodeScoreMap: Record<number, number>;
    setNodeScoreMap: Dispatch<SetStateAction<Record<number, number>>>;

    /** Tree filter: when false (default), question nodes are hidden */
    showQuestionNodes: boolean;
    setShowQuestionNodes: Dispatch<SetStateAction<boolean>>;

    /** Node IDs being dragged from the tree toward the test panel */
    testDropNodeIds: number[];
    setTestDropNodeIds: Dispatch<SetStateAction<number[]>>;

    /** Global daily review: number of tests with due questions (for ActivityBar badge) */
    dailyReviewDueCount: number;
    setDailyReviewDueCount: Dispatch<SetStateAction<number>>;

    /** Cut/paste clipboard for question nodes — persists across node navigation */
    kFlowClipboard: KFlowClipboard | null;
    setKFlowClipboard: Dispatch<SetStateAction<KFlowClipboard | null>>;

    /** Last viewport (x, y, zoom) per knowledgeId (0 = orphan) */
    kFlowViewportMap: Record<number, { x: number; y: number; zoom: number }>;
    setKFlowViewportMap: Dispatch<SetStateAction<Record<number, { x: number; y: number; zoom: number }>>>;
}

// @deprecated alias
export interface KWorkspaceContextData extends KContextData {}
