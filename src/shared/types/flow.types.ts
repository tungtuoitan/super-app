
export interface FlowEdgeDTO {
    id: number;
    sourceId: number;
    sourceType: string;
    sourceHandle: string;
    targetId: number;
    targetType: string;
    targetHandle: string;
    note: string | null;
    arrowDirection: "forward" | "backward" | "both";
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface FlowNodePositionDTO {
    id: number;
    nodeId: number;
    nodeType: string;
    x: number;
    y: number;
}

export interface UpsertFlowEdgePayload {
    id?: number | null;
    sourceId: number;
    sourceType?: string;
    sourceHandle?: string;
    targetId: number;
    targetType?: string;
    targetHandle?: string;
    note?: string | null;
    arrowDirection?: "forward" | "backward" | "both";
    deletedAt?: string | null;
}

export interface UpsertFlowNodePositionPayload {
    nodeId: number;
    nodeType?: string;
    x: number;
    y: number;
}
