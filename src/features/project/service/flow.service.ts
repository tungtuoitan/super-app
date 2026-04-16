/**
 * Flow Service — API communication for Task Flow canvas data.
 * Manages arbitrary edges (with notes) and saved node positions.
 */

import { config } from "@/config/app.config";
import { apiFetch } from "@/services/apiClient";
import type { ResultOptions } from "../../../types";

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

const base = () => `${config.api.baseURL}/api/flow`;

const _getEdges = async (_token: string): Promise<ResultOptions<FlowEdgeDTO>> => {
    const res = await apiFetch(`${base()}/edges`, { method: "GET" });
    if (res.ok) return (await res.json()) as ResultOptions<FlowEdgeDTO>;
    return Promise.reject(res);
};

const _upsertEdges = async (
    _token: string,
    edges: UpsertFlowEdgePayload[],
): Promise<ResultOptions<FlowEdgeDTO>> => {
    const res = await apiFetch(`${base()}/edges/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edges),
    });
    if (res.ok) return (await res.json()) as ResultOptions<FlowEdgeDTO>;
    return Promise.reject(res);
};

const _getPositions = async (
    _token: string,
    params?: { nodeIds?: string; nodeType?: string },
): Promise<ResultOptions<FlowNodePositionDTO>> => {
    const q = new URLSearchParams();
    if (params?.nodeIds) q.append("nodeIds", params.nodeIds);
    if (params?.nodeType) q.append("nodeType", params.nodeType);
    const qs = q.toString();
    const res = await apiFetch(`${base()}/positions${qs ? `?${qs}` : ""}`, { method: "GET" });
    if (res.ok) return (await res.json()) as ResultOptions<FlowNodePositionDTO>;
    return Promise.reject(res);
};

const _upsertPositions = async (
    _token: string,
    positions: UpsertFlowNodePositionPayload[],
): Promise<ResultOptions<unknown>> => {
    const res = await apiFetch(`${base()}/positions/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(positions),
    });
    if (res.ok) return (await res.json()) as ResultOptions<unknown>;
    return Promise.reject(res);
};

export const flowService = {
    _getEdges,
    _upsertEdges,
    _getPositions,
    _upsertPositions,
};
