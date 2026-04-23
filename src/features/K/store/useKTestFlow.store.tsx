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
    /** Passed down from parent so helper can call API without prop drilling */
    knowledgeId: number;
    setKnowledgeId: Dispatch<SetStateAction<number>>;
    activeTestId: number | null;
    setActiveTestId: Dispatch<SetStateAction<number | null>>;
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
    activeTestId: null, setActiveTestId: () => {},
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
    const [activeTestId, setActiveTestId] = useState<number | null>(null);

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
            activeTestId, setActiveTestId,
        }}>
            {children}
        </KTestFlowStore.Provider>
    );
};
