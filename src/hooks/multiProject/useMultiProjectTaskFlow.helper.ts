/**
 * MultiProject Task Flow Helper
 * Callbacks only (useCallback). Handles node changes, edge management,
 * auto-layout, and position/edge persistence.
 *
 * Node-specific callbacks (rename, create, change project/status) live in
 * useMultiProjectTaskFlowNode.helper.ts
 */

import { useCallback, useRef } from "react";
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import type { NodeChange, EdgeChange, Connection, Edge } from "@xyflow/react";
import { useMultiTaskFlowStore } from "@/store/task/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowSelector } from "@/Selectors/multipleProject/useMultiProjectTaskFlow.selector";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useConsoleHelper } from "../console/useConsole.helper";
import { flowService } from "@/services/flow.service";
import type { FlowEdgeData, ArrowDirection } from "@/types/multiProject/multiProjectTaskFlow.type";
import { buildTaskFlowLayout, smartWand } from "@/utils/project/multiProjectTaskFlow.utils";

export const useMultiProjectTaskFlowHelper = () => {
    const { setFlowNodes, setFlowEdges, setEditingEdgeId, setSavedEdges, setDraggingNodeId, setSavedPositions } = useMultiTaskFlowStore();
    const { filteredTasks, projectNameMap, savedEdges } = useMultiProjectTaskFlowSelector();
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const reconnectingRef = useRef(false);

    // ── Node changes (drag/select) ──────────────────────────────────────────

    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            setFlowNodes((prev) => applyNodeChanges(changes, prev) as typeof prev);
        },
        [setFlowNodes],
    );

    // ── Edge changes (select → toggle reconnectable) ──────────────────────

    const handleEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            setFlowEdges((prev) => {
                const updated = applyEdgeChanges(changes, prev);
                const hasSelectChange = changes.some((c) => c.type === "select");
                if (!hasSelectChange) return updated;
                return updated.map((e) =>
                    e.type === "flowEdgeWithNote" ? { ...e, reconnectable: !!e.selected } : e,
                );
            });
        },
        [setFlowEdges],
    );

    // ── Save positions on drag stop ─────────────────────────────────────────

    const handleNodeDragStart = useCallback(
        (_event: React.MouseEvent, node: { id: string }) => {
            setDraggingNodeId(node.id);
        },
        [setDraggingNodeId],
    );

    const handleNodeDragStop = useCallback(
        (_event: React.MouseEvent, node: { id: string; position: { x: number; y: number } }) => {
            setDraggingNodeId(null);
            // Update savedPositions so Effect 2 (taskIdKey rebuild) preserves this position
            setSavedPositions((prev) => ({ ...prev, [node.id]: node.position }));
            const nodeId = parseInt(node.id, 10);
            if (!nodeId) return;
            flowService._upsertPositions($user.userToken, [
                { nodeId, nodeType: "task", x: node.position.x, y: node.position.y },
            ]).catch(() => {});
        },
        [setDraggingNodeId, setSavedPositions, $user.userToken],
    );

    // ── Custom edge connect ─────────────────────────────────────────────────

    const handleConnect = useCallback(
        async (connection: Connection) => {
            if (reconnectingRef.current) return;
            if (!connection.source || !connection.target) return;

            const tempId = `temp-${Date.now()}`;
            const newEdge: Edge<FlowEdgeData> = {
                id: tempId,
                source: connection.source,
                target: connection.target,
                sourceHandle: connection.sourceHandle ?? "bottom",
                targetHandle: connection.targetHandle ?? "top",
                type: "flowEdgeWithNote",
                reconnectable: false,
                data: { edgeId: 0, note: null, arrowDirection: "forward" },
            };

            setFlowEdges((prev) => [...prev, newEdge]);

            try {
                const result = await flowService._upsertEdges($user.userToken, [{
                    sourceId: parseInt(connection.source, 10),
                    sourceType: "task",
                    sourceHandle: connection.sourceHandle ?? "bottom",
                    targetId: parseInt(connection.target, 10),
                    targetType: "task",
                    targetHandle: connection.targetHandle ?? "top",
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
        },
        [$user.userToken, setFlowEdges, setSavedEdges, _console],
    );

    // ── Edge note editing ───────────────────────────────────────────────────

    const handleEdgeNoteConfirm = useCallback(
        async (edgeId: string, note: string, arrowDirection: ArrowDirection) => {
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
        },
        [savedEdges, setFlowEdges, setSavedEdges, setEditingEdgeId, $user.userToken, _console],
    );

    const handleEdgeDelete = useCallback(
        async (edgeId: string) => {
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
        },
        [savedEdges, setFlowEdges, setSavedEdges, setEditingEdgeId, $user.userToken, _console],
    );

    // ── Reconnect (drag edge endpoint to new node) ──────────────────────────

    const handleReconnectStart = useCallback(() => { reconnectingRef.current = true; }, []);
    const handleReconnectEnd = useCallback(() => { reconnectingRef.current = false; }, []);

    const handleReconnect = useCallback(
        async (oldEdge: Edge, newConnection: Connection) => {
            if (!newConnection.source || !newConnection.target) return;

            const updated: Edge<FlowEdgeData> = {
                ...oldEdge,
                source: newConnection.source,
                target: newConnection.target,
                sourceHandle: newConnection.sourceHandle ?? oldEdge.sourceHandle,
                targetHandle: newConnection.targetHandle ?? oldEdge.targetHandle,
                data: oldEdge.data as FlowEdgeData,
            };

            setFlowEdges((prev) => prev.map((e) => (e.id === oldEdge.id ? updated : e)));
            setSavedEdges((prev) => prev.map((e) => (e.id === oldEdge.id ? updated : e)));

            const edgeData = oldEdge.data as FlowEdgeData;
            if (!edgeData?.edgeId) return;

            flowService._upsertEdges($user.userToken, [{
                id: edgeData.edgeId,
                sourceId: parseInt(newConnection.source, 10),
                sourceHandle: newConnection.sourceHandle ?? "bottom",
                targetId: parseInt(newConnection.target, 10),
                targetHandle: newConnection.targetHandle ?? "top",
                note: edgeData.note,
                arrowDirection: edgeData.arrowDirection,
            }]).catch(() => _console.error("Failed to update connection"));
        },
        [setFlowEdges, setSavedEdges, $user.userToken, _console],
    );

    // ── Auto layout ─────────────────────────────────────────────────────────

    // ── Intelligent adjust (gentle alignment, minimal movement) ────────────

    const handleAutoLayout = useCallback(() => {
        setFlowNodes((prev) => {
            // Collect all edges (auto + custom) for alignment analysis
            const allEdges = [
                ...filteredTasks
                    .filter((t) => t.parentTaskId)
                    .map((t) => ({ source: String(t.parentTaskId), target: String(t.id) })),
                ...savedEdges.map((e) => ({ source: e.source, target: e.target })),
            ];
            const adjusted = smartWand(prev, allEdges);

            // Persist adjusted positions (best-effort) and update savedPositions
            const newPositions: Record<string, { x: number; y: number }> = {};
            const payload = adjusted.map((n) => {
                newPositions[n.id] = n.position;
                return {
                    nodeId: parseInt(n.id, 10),
                    nodeType: "task",
                    x: n.position.x,
                    y: n.position.y,
                };
            }).filter((p) => p.nodeId > 0);
            setSavedPositions(newPositions);
            if (payload.length > 0) {
                flowService._upsertPositions($user.userToken, payload).catch(() => {});
            }

            return adjusted;
        });
    }, [filteredTasks, savedEdges, setFlowNodes, setSavedPositions, $user.userToken]);

    return {
        handleNodesChange,
        handleEdgesChange,
        handleNodeDragStart,
        handleNodeDragStop,
        handleConnect,
        handleReconnectStart,
        handleReconnectEnd,
        handleReconnect,
        handleEdgeNoteConfirm,
        handleEdgeDelete,
        handleAutoLayout,
    };
};
