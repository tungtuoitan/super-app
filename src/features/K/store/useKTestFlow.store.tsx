import React, { createContext, useContext, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { QuestionFlowNodeData, KFlowEdgeData } from "@/features/K/types/kTestFlow.type";

export interface KTestFlowContextData {
    flowNodes: Node<QuestionFlowNodeData>[];
    setFlowNodes: Dispatch<SetStateAction<Node<QuestionFlowNodeData>[]>>;
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
    /** The knowledge whose questions are shown in this canvas */
    knowledgeId: number;
    setKnowledgeId: Dispatch<SetStateAction<number>>;
    /** Node IDs to auto-select after the next rebuild (cleared once applied) */
    pendingSelectIds: number[];
    setPendingSelectIds: Dispatch<SetStateAction<number[]>>;
}

const defaultValue: KTestFlowContextData = {
    flowNodes: [], setFlowNodes: () => {},
    flowEdges: [], setFlowEdges: () => {},
    savedEdges: [], setSavedEdges: () => {},
    savedPositions: {}, setSavedPositions: () => {},
    positionsLoaded: false, setPositionsLoaded: () => {},
    editingNodeId: null, setEditingNodeId: () => {},
    editingEdgeId: null, setEditingEdgeId: () => {},
    connectingSourceId: null, setConnectingSourceId: () => {},
    knowledgeId: 0, setKnowledgeId: () => {},
    pendingSelectIds: [], setPendingSelectIds: () => {},
};

const KTestFlowStore = createContext<KTestFlowContextData>(defaultValue);

export const useKTestFlowStore = () => useContext(KTestFlowStore);

export const KTestFlowProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [flowNodes, setFlowNodes] = useState<Node<QuestionFlowNodeData>[]>([]);
    const [flowEdges, setFlowEdges] = useState<Edge<KFlowEdgeData>[]>([]);
    const [savedEdges, setSavedEdges] = useState<Edge<KFlowEdgeData>[]>([]);
    const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }>>({});
    const [positionsLoaded, setPositionsLoaded] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
    const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
    const [knowledgeId, setKnowledgeId] = useState(0);
    const [pendingSelectIds, setPendingSelectIds] = useState<number[]>([]);

    return (
        <KTestFlowStore.Provider value={{
            flowNodes, setFlowNodes,
            flowEdges, setFlowEdges,
            savedEdges, setSavedEdges,
            savedPositions, setSavedPositions,
            positionsLoaded, setPositionsLoaded,
            editingNodeId, setEditingNodeId,
            editingEdgeId, setEditingEdgeId,
            connectingSourceId, setConnectingSourceId,
            knowledgeId, setKnowledgeId,
            pendingSelectIds, setPendingSelectIds,
        }}>
            {children}
        </KTestFlowStore.Provider>
    );
};
