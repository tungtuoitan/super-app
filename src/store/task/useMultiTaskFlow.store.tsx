/**
 * MultiTaskFlow Store
 * Holds React Flow node/edge state + inline-editing state for the Task Flow tab.
 * Context-based so it's scoped to the MultiProjectTaskFlowView lifecycle.
 */

import React, { createContext, useContext, useState, Dispatch, SetStateAction } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { TaskFlowNodeData, FlowEdgeData } from "@/types/multiProject/multiProjectTaskFlow.type";
import type { Task } from "@/types/task/task.types";

export interface MultiTaskFlowContextData {
    /** Parent-child + user-created edges (rendered by React Flow) */
    flowNodes: Node<TaskFlowNodeData>[];
    setFlowNodes: Dispatch<SetStateAction<Node<TaskFlowNodeData>[]>>;
    flowEdges: Edge[];
    setFlowEdges: Dispatch<SetStateAction<Edge[]>>;
    /** ID of the node currently being renamed inline (null = none) */
    editingNodeId: string | null;
    setEditingNodeId: Dispatch<SetStateAction<string | null>>;
    /** Edge ID currently showing the note popover (null = none) */
    editingEdgeId: string | null;
    setEditingEdgeId: Dispatch<SetStateAction<string | null>>;
    /** ID of the node currently being dragged (null = none) */
    draggingNodeId: string | null;
    setDraggingNodeId: Dispatch<SetStateAction<string | null>>;
    /** Saved custom edges loaded from backend (source of truth for re-render after load) */
    savedEdges: Edge<FlowEdgeData>[];
    setSavedEdges: Dispatch<SetStateAction<Edge<FlowEdgeData>[]>>;
    /** Node positions loaded from backend (keyed by node id) */
    savedPositions: Record<string, { x: number; y: number }>;
    setSavedPositions: Dispatch<SetStateAction<Record<string, { x: number; y: number }>>>;
    /** Whether positions have been loaded from backend this session */
    positionsLoaded: boolean;
    setPositionsLoaded: Dispatch<SetStateAction<boolean>>;
    /** When true, dragged nodes snap center-to-center with connected neighbors */
    autoAlign: boolean;
    setAutoAlign: Dispatch<SetStateAction<boolean>>;
    /** Node ID that is currently the source of a connection drag (null = not dragging) */
    connectingSourceId: string | null;
    setConnectingSourceId: Dispatch<SetStateAction<string | null>>;
    /** All non-deleted tasks loaded without status/priority filters — used by TaskFlow to show full picture */
    taskFlowTasks: Task[];
    setTaskFlowTasks: Dispatch<SetStateAction<Task[]>>;
}

const defaultValue: MultiTaskFlowContextData = {
    flowNodes: [],
    setFlowNodes: () => {},
    flowEdges: [],
    setFlowEdges: () => {},
    editingNodeId: null,
    setEditingNodeId: () => {},
    editingEdgeId: null,
    setEditingEdgeId: () => {},
    draggingNodeId: null,
    setDraggingNodeId: () => {},
    savedEdges: [],
    setSavedEdges: () => {},
    savedPositions: {},
    setSavedPositions: () => {},
    positionsLoaded: false,
    setPositionsLoaded: () => {},
    autoAlign: false,
    setAutoAlign: () => {},
    connectingSourceId: null,
    setConnectingSourceId: () => {},
    taskFlowTasks: [],
    setTaskFlowTasks: () => {},
};

const MultiTaskFlowStore = createContext<MultiTaskFlowContextData>(defaultValue);

export const useMultiTaskFlowStore = () => useContext(MultiTaskFlowStore);

export const MultiTaskFlowProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [flowNodes, setFlowNodes] = useState<Node<TaskFlowNodeData>[]>([]);
    const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [savedEdges, setSavedEdges] = useState<Edge<FlowEdgeData>[]>([]);
    const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }>>({});
    const [positionsLoaded, setPositionsLoaded] = useState(false);
    const [autoAlign, setAutoAlign] = useState(false);
    const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
    const [taskFlowTasks, setTaskFlowTasks] = useState<Task[]>([]);

    return (
        <MultiTaskFlowStore.Provider
            value={{
                flowNodes, setFlowNodes,
                flowEdges, setFlowEdges,
                editingNodeId, setEditingNodeId,
                editingEdgeId, setEditingEdgeId,
                draggingNodeId, setDraggingNodeId,
                savedEdges, setSavedEdges,
                savedPositions, setSavedPositions,
                positionsLoaded, setPositionsLoaded,
                autoAlign, setAutoAlign,
                connectingSourceId, setConnectingSourceId,
                taskFlowTasks, setTaskFlowTasks,
            }}
        >
            {children}
        </MultiTaskFlowStore.Provider>
    );
};
