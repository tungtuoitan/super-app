/**
 * K Store Context
 * Centralized state management for K explorer
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from "react";
import type { KWsResponse } from "../types/K.types";
import type { KDTO } from "../types/K-dto.types";
import type { KTreeNode } from "../hooks/Ktree.miniHelper";

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
     * KKnowledgeEditorPanel reads this, switches to import tab, then resets to undefined.
     */
    pendingImportNodeId: number | null | undefined;
    setPendingImportNodeId: Dispatch<SetStateAction<number | null | undefined>>;

    /**
     * Pending quiz tab switch — set by node click in tree.
     * undefined  = no pending switch
     * number     = switch to quiz tab (value = clicked node id)
     * KKnowledgeEditorPanel reads this, switches to quiz tab, then resets to undefined.
     */
    pendingQuizTabSwitch: number | null | undefined;
    setPendingQuizTabSwitch: Dispatch<SetStateAction<number | null | undefined>>;

    /** Latest quiz score per question nodeId (nodeType="question") — used for tree score overlay */
    nodeScoreMap: Record<number, number>;
    setNodeScoreMap: Dispatch<SetStateAction<Record<number, number>>>;

    /** Tree filter: when false (default), question nodes are hidden */
    showQuestionNodes: boolean;
    setShowQuestionNodes: Dispatch<SetStateAction<boolean>>;

    /** Node IDs being dragged from the tree toward the test panel — cleared on dragEnd */
    testDropNodeIds: number[];
    setTestDropNodeIds: Dispatch<SetStateAction<number[]>>;

    /** Global daily review: number of tests with due questions (for ActivityBar badge) */
    dailyReviewDueCount: number;
    setDailyReviewDueCount: Dispatch<SetStateAction<number>>;
}

// @deprecated aliases — remove after all consumers updated
export interface KWorkspaceContextData extends KContextData {}

const kContextDefaultValue: KContextData = {
    allK: [],
    setAllK: () => {},
    currentK: null,
    setCurrentK: () => {},
    isLoadingK: false,
    setIsLoadingK: () => {},
    isLoadingTree: false,
    setIsLoadingTree: () => {},
    isLoadingTreeByOpeningNode: false,
    setIsLoadingTreeByOpeningNode: () => {},

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
    selectedKId: null,
    setSelectedKId: () => {},

    treeContainerRef: { current: null },
    containerHeight: 800,
    setContainerHeight: () => {},
    dropZoneHeight: 0,
    setDropZoneHeight: () => {},
    treeData: [],
    setTreeData: () => {},

    scrollToItem: false,
    setScrollToItem: () => {},

    hoveredNodeId: null,
    setHoveredNodeId: () => {},

    markedNodeId: null,
    setMarkedNodeId: () => {},

    pendingImportNodeId: undefined,
    setPendingImportNodeId: () => {},

    pendingQuizTabSwitch: undefined,
    setPendingQuizTabSwitch: () => {},

    nodeScoreMap: {},
    setNodeScoreMap: () => {},
    showQuestionNodes: false,
    setShowQuestionNodes: () => {},
    testDropNodeIds: [],
    setTestDropNodeIds: () => {},
    dailyReviewDueCount: 0,
    setDailyReviewDueCount: () => {},
};

// @deprecated alias
export const kWorkspaceContextDefaultValue = kContextDefaultValue;

export const KStore = createContext<KContextData>(kContextDefaultValue);

// @deprecated alias
export const KWorkspaceStore = KStore;

export const useKStore = () => useContext(KStore);

export const KProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [allK, setAllK] = useState<KWsResponse[]>([]);
    const [currentK, setCurrentK] = useState<KDTO | null>(null);
    const [isLoadingK, setIsLoadingK] = useState<boolean>(false);
    const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
    const [isLoadingTreeByOpeningNode, setIsLoadingTreeByOpeningNode] = useState<boolean>(false);

    const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
    const [searchText, setSearchText] = useState<string>("");

    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [lastSelectedItemId, setLastSelectedItemId] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const _treeRef = useRef<any>(null);
    const [selectedKId, setSelectedKId] = useState<number | null>(null);

    const treeContainerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState<number>(800);
    const [dropZoneHeight, setDropZoneHeight] = useState<number>(0);
    const [treeData, setTreeData] = useState<KTreeNode[]>([]);

    const [scrollToItem, setScrollToItem] = useState<boolean>(false);
    const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
    const [markedNodeId, setMarkedNodeId] = useState<number | null>(null);
    const [pendingImportNodeId, setPendingImportNodeId] = useState<number | null | undefined>(undefined);
    const [pendingQuizTabSwitch, setPendingQuizTabSwitch] = useState<number | null | undefined>(undefined);
    const [nodeScoreMap, setNodeScoreMap] = useState<Record<number, number>>({});
    const [showQuestionNodes, setShowQuestionNodes] = useState<boolean>(false);
    const [testDropNodeIds, setTestDropNodeIds]     = useState<number[]>([]);
    const [dailyReviewDueCount, setDailyReviewDueCount] = useState<number>(0);

    return (
        <KStore.Provider
            value={{
                allK,
                setAllK,
                currentK,
                setCurrentK,
                isLoadingK,
                setIsLoadingK,
                isLoadingTree,
                setIsLoadingTree,
                isLoadingTreeByOpeningNode,
                setIsLoadingTreeByOpeningNode,

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
                selectedKId,
                setSelectedKId,

                treeContainerRef,
                containerHeight,
                setContainerHeight,
                dropZoneHeight,
                setDropZoneHeight,
                treeData,
                setTreeData,

                scrollToItem,
                setScrollToItem,

                hoveredNodeId,
                setHoveredNodeId,

                markedNodeId,
                setMarkedNodeId,

                pendingImportNodeId,
                setPendingImportNodeId,

                pendingQuizTabSwitch,
                setPendingQuizTabSwitch,

                nodeScoreMap,
                setNodeScoreMap,
                showQuestionNodes,
                setShowQuestionNodes,
                testDropNodeIds,
                setTestDropNodeIds,
                dailyReviewDueCount,
                setDailyReviewDueCount,
            }}
        >
            {children}
        </KStore.Provider>
    );
};
