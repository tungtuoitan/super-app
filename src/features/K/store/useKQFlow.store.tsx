import React, { createContext, useContext, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { KQFlowNodeData, KFlowEdgeData } from "@/features/K/types/kQFlow.type";

export interface KQFlowContextData {
    flowNodes: Node<KQFlowNodeData>[];
    setFlowNodes: Dispatch<SetStateAction<Node<KQFlowNodeData>[]>>;
    flowEdges: Edge<KFlowEdgeData>[];
    setFlowEdges: Dispatch<SetStateAction<Edge<KFlowEdgeData>[]>>;
    savedEdges: Edge<KFlowEdgeData>[];
    setSavedEdges: Dispatch<SetStateAction<Edge<KFlowEdgeData>[]>>;
    savedPositions: Record<string, { x: number; y: number }>;
    setSavedPositions: Dispatch<SetStateAction<Record<string, { x: number; y: number }>>>;
    positionsLoaded: boolean;
    setPositionsLoaded: Dispatch<SetStateAction<boolean>>;
    editingNodeId: string | null;
    setEditingNodeId: Dispatch<SetStateAction<string | null>>;
    editingEdgeId: string | null;
    setEditingEdgeId: Dispatch<SetStateAction<string | null>>;
    connectingSourceId: string | null;
    setConnectingSourceId: Dispatch<SetStateAction<string | null>>;
    /** The K tree node whose questions are shown in this canvas (0 = orphan mode) */
    nodeId: number;
    setNodeId: Dispatch<SetStateAction<number>>;
    /** Node IDs to auto-select after the next rebuild (cleared once applied) */
    pendingSelectIds: number[];
    setPendingSelectIds: Dispatch<SetStateAction<number[]>>;
}

const defaultValue: KQFlowContextData = {
    flowNodes: [], setFlowNodes: () => {},
    flowEdges: [], setFlowEdges: () => {},
    savedEdges: [], setSavedEdges: () => {},
    savedPositions: {}, setSavedPositions: () => {},
    positionsLoaded: false, setPositionsLoaded: () => {},
    editingNodeId: null, setEditingNodeId: () => {},
    editingEdgeId: null, setEditingEdgeId: () => {},
    connectingSourceId: null, setConnectingSourceId: () => {},
    nodeId: 0, setNodeId: () => {},
    pendingSelectIds: [], setPendingSelectIds: () => {},
};

const KQFlowStore = createContext<KQFlowContextData>(defaultValue);

export const useKQFlowStore = () => useContext(KQFlowStore);

export const KQFlowProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [flowNodes, setFlowNodes] = useState<Node<KQFlowNodeData>[]>([]);
    const [flowEdges, setFlowEdges] = useState<Edge<KFlowEdgeData>[]>([]);
    const [savedEdges, setSavedEdges] = useState<Edge<KFlowEdgeData>[]>([]);
    const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }>>({});
    const [positionsLoaded, setPositionsLoaded] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
    const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
    const [nodeId, setNodeId] = useState(0);
    const [pendingSelectIds, setPendingSelectIds] = useState<number[]>([]);

    return (
        <KQFlowStore.Provider value={{
            flowNodes, setFlowNodes,
            flowEdges, setFlowEdges,
            savedEdges, setSavedEdges,
            savedPositions, setSavedPositions,
            positionsLoaded, setPositionsLoaded,
            editingNodeId, setEditingNodeId,
            editingEdgeId, setEditingEdgeId,
            connectingSourceId, setConnectingSourceId,
            nodeId, setNodeId,
            pendingSelectIds, setPendingSelectIds,
        }}>
            {children}
        </KQFlowStore.Provider>
    );
};
