/**
 * MultiProject Task Flow Edge Helper
 * Edge connection, reconnect, note editing, and deletion callbacks.
 */

import { useRef } from "react";
import type { Connection, Edge } from "@xyflow/react";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowSelector } from "../../Selectors/useMultiProjectTaskFlow.selector";
import { useMultiProjectTaskFlowHelper } from "./useMultiProjectTaskFlow.helper";
import { useAuthStore } from "@/shared";
import { useConsoleHelper } from "@/shared";
import { flowService } from "@/shared";
import { useDebugLog } from "@/shared";
import type { FlowEdgeData, ArrowDirection, TaskFlowNodeData } from "../../types/multiProjectTaskFlow.type";
import { nearestHandlePair, NODE_WIDTH, estimateNodeHeight } from "../../utils/multiProjectTaskFlow.utils";

export const useMultiProjectTaskFlowEdgeHelper = () => {
    const { setFlowEdges, setEditingEdgeId, setSavedEdges, setConnectingSourceId, flowNodes } = useMultiTaskFlowStore();
    const { savedEdges } = useMultiProjectTaskFlowSelector();
    const { isNodeLocked, isEdgeLocked } = useMultiProjectTaskFlowHelper();
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const debugLog = useDebugLog();
    const reconnectingRef = useRef(false);

    // ── Resolve handles ─────────────────────────────────────────────────────

    const resolveHandles =
        (sourceId: string, targetId: string, sourceHandle?: string | null, targetHandle?: string | null) => {
            if (sourceHandle && targetHandle) return { sourceHandle, targetHandle };
            const srcNode = flowNodes.find((n) => n.id === sourceId);
            const tgtNode = flowNodes.find((n) => n.id === targetId);
            if (!srcNode || !tgtNode) return { sourceHandle: sourceHandle ?? "bottom", targetHandle: targetHandle ?? "top" };
            const srcH = srcNode.measured?.height ?? estimateNodeHeight((srcNode.data as TaskFlowNodeData).task);
            const tgtH = tgtNode.measured?.height ?? estimateNodeHeight((tgtNode.data as TaskFlowNodeData).task);
            const pair = nearestHandlePair(
                srcNode.position.x + NODE_WIDTH / 2, srcNode.position.y + srcH / 2,
                tgtNode.position.x + NODE_WIDTH / 2, tgtNode.position.y + tgtH / 2,
            );
            return {
                sourceHandle: sourceHandle ?? pair.sourceHandle,
                targetHandle: targetHandle ?? pair.targetHandle,
            };
        }

    // ── Connection drag tracking ────────────────────────────────────────────

    const handleConnectStart =
        (_: unknown, params: { nodeId?: string | null }) => {
            setConnectingSourceId(params.nodeId ?? null);
        }

    const handleConnectEnd = () => {
        setConnectingSourceId(null);
    }

    // ── Connect ─────────────────────────────────────────────────────────────

    const handleConnect =
        async (connection: Connection) => {
            if (reconnectingRef.current) return;
            if (!connection.source || !connection.target) return;

            if (isNodeLocked(connection.source) || isNodeLocked(connection.target)) {
                debugLog.log("taskflow", "locked-node-blocked", { action: "connect", source: connection.source, target: connection.target });
                return;
            }

            const { sourceHandle, targetHandle } = resolveHandles(
                connection.source, connection.target,
                connection.sourceHandle, connection.targetHandle,
            );

            const tempId = `temp-${Date.now()}`;
            const newEdge: Edge<FlowEdgeData> = {
                id: tempId,
                source: connection.source,
                target: connection.target,
                sourceHandle,
                targetHandle,
                type: "flowEdgeWithNote",
                reconnectable: false,
                data: { edgeId: 0, note: null, arrowDirection: "forward" },
            };

            setFlowEdges((prev) => [...prev, newEdge]);

            try {
                const result = await flowService._upsertEdges($user.userToken, [{
                    sourceId: parseInt(connection.source, 10),
                    sourceType: "task",
                    sourceHandle,
                    targetId: parseInt(connection.target, 10),
                    targetType: "task",
                    targetHandle,
                    note: null,
                }]);

                if (!result.success || !result.data?.length) throw new Error(result.message);
                const saved = result.data[0] as { id: number };

                const persistedEdge: Edge<FlowEdgeData> = {
                    ...newEdge,
                    id: `custom-${saved.id}`,
                    data: { edgeId: saved.id, note: null, arrowDirection: "forward" },
                };
                setFlowEdges((prev) => prev.map((e) => (e.id === tempId ? persistedEdge : e)));
                setSavedEdges((prev) => [...prev, persistedEdge]);
            } catch {
                setFlowEdges((prev) => prev.filter((e) => e.id !== tempId));
                _console.error("Failed to save connection");
            }
        }

    // ── Reconnect ───────────────────────────────────────────────────────────

    const handleReconnectStart = () => { reconnectingRef.current = true; }
    const handleReconnectEnd = () => { reconnectingRef.current = false; }

    const handleReconnect =
        async (oldEdge: Edge, newConnection: Connection) => {
            if (!newConnection.source || !newConnection.target) return;

            if (isEdgeLocked(oldEdge.id) || isNodeLocked(newConnection.source) || isNodeLocked(newConnection.target)) {
                debugLog.log("taskflow", "locked-node-blocked", { action: "reconnect", edgeId: oldEdge.id, newSource: newConnection.source, newTarget: newConnection.target });
                return;
            }

            const { sourceHandle, targetHandle } = resolveHandles(
                newConnection.source, newConnection.target,
                newConnection.sourceHandle, newConnection.targetHandle,
            );

            const updated: Edge<FlowEdgeData> = {
                ...oldEdge,
                source: newConnection.source,
                target: newConnection.target,
                sourceHandle,
                targetHandle,
                data: oldEdge.data as FlowEdgeData,
            };

            setFlowEdges((prev) => prev.map((e) => (e.id === oldEdge.id ? updated : e)));
            setSavedEdges((prev) => prev.map((e) => (e.id === oldEdge.id ? updated : e)));

            const edgeData = oldEdge.data as FlowEdgeData;
            if (!edgeData?.edgeId) return;

            flowService._upsertEdges($user.userToken, [{
                id: edgeData.edgeId,
                sourceId: parseInt(newConnection.source, 10),
                sourceHandle,
                targetId: parseInt(newConnection.target, 10),
                targetHandle,
                note: edgeData.note,
                arrowDirection: edgeData.arrowDirection,
            }]).catch(() => _console.error("Failed to update connection"));
        }

    // ── Edge note ───────────────────────────────────────────────────────────

    const handleEdgeNoteConfirm =
        async (edgeId: string, note: string, arrowDirection: ArrowDirection) => {
            if (isEdgeLocked(edgeId)) {
                debugLog.log("taskflow", "locked-node-blocked", { action: "edgeNote", edgeId });
                setEditingEdgeId(null);
                return;
            }
            setEditingEdgeId(null);
            const trimmed = note.trim() || null;

            const edge = savedEdges.find((e) => e.id === edgeId);
            if (!edge?.data) return;

            const backendId = (edge.data as FlowEdgeData).edgeId;
            if (!backendId) return;

            const updatedData: FlowEdgeData = { ...(edge.data as FlowEdgeData), note: trimmed, arrowDirection };
            setFlowEdges((prev) =>
                prev.map((e) => e.id === edgeId ? { ...e, data: updatedData } : e),
            );
            setSavedEdges((prev) =>
                prev.map((e) => e.id === edgeId ? { ...e, data: updatedData } : e),
            );

            try {
                await flowService._upsertEdges($user.userToken, [{
                    id: backendId,
                    sourceId: parseInt(edge.source, 10),
                    targetId: parseInt(edge.target, 10),
                    sourceHandle: edge.sourceHandle ?? "bottom",
                    targetHandle: edge.targetHandle ?? "top",
                    note: trimmed,
                    arrowDirection,
                }]);
            } catch {
                _console.error("Failed to save note");
            }
        }

    // ── Edge delete ─────────────────────────────────────────────────────────

    const handleEdgeDelete =
        async (edgeId: string) => {
            if (isEdgeLocked(edgeId)) {
                debugLog.log("taskflow", "locked-node-blocked", { action: "edgeDelete", edgeId });
                return;
            }
            setEditingEdgeId(null);
            const edge = savedEdges.find((e) => e.id === edgeId);

            setFlowEdges((prev) => prev.filter((e) => e.id !== edgeId));
            setSavedEdges((prev) => prev.filter((e) => e.id !== edgeId));

            if (!edge?.data) return;
            const backendId = (edge.data as FlowEdgeData).edgeId;
            if (!backendId) return;

            try {
                await flowService._upsertEdges($user.userToken, [{
                    id: backendId,
                    sourceId: parseInt(edge.source, 10),
                    targetId: parseInt(edge.target, 10),
                    sourceHandle: edge.sourceHandle ?? "bottom",
                    targetHandle: edge.targetHandle ?? "top",
                    deletedAt: new Date().toISOString(),
                }]);
            } catch {
                _console.error("Failed to delete connection");
            }
        }

    return {
        handleConnect,
        handleConnectStart,
        handleConnectEnd,
        handleReconnectStart,
        handleReconnectEnd,
        handleReconnect,
        handleEdgeNoteConfirm,
        handleEdgeDelete,
        isEdgeLocked,
    };
};
