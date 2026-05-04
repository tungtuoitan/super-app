/**
 * K Store Context
 * Centralized state management for K explorer
 */

import { useContext, createContext, useState, useRef } from "react";
import type { KFlowClipboard, KContextData } from "../types/kContext.type";
import type { KWsResponse } from "../types/k.type";
import type { KDTO } from "../types/kDto.type";
import {KTreeNode} from "../types/kV2.type";

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

    kFlowClipboard: null,
    setKFlowClipboard: () => {},
    kFlowViewportMap: {},
    setKFlowViewportMap: () => {},
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
    const [kFlowClipboard, setKFlowClipboard] = useState<KFlowClipboard | null>(null);
    const [kFlowViewportMap, setKFlowViewportMap] = useState<Record<number, { x: number; y: number; zoom: number }>>({});

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

                kFlowClipboard,
                setKFlowClipboard,
                kFlowViewportMap,
                setKFlowViewportMap,
            }}
        >
            {children}
        </KStore.Provider>
    );
};
