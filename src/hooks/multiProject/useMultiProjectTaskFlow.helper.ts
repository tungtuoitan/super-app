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
import { useMultiProjectDetailSelector } from "@/Selectors/multipleProject/useMultiProjectDetail.selector";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useConsoleHelper } from "../console/useConsole.helper";
import { flowService } from "@/services/flow.service";
import { taskService } from "@/services/task.service";
import type { TaskDTO } from "@/services/task.service";
import type { Task } from "@/types/task/task.types";
import type { FlowEdgeData, ArrowDirection, TaskFlowNodeData } from "@/types/multiProject/multiProjectTaskFlow.type";
import { buildTaskFlowLayout, smartWand, computeOptimalHandles, nearestHandlePair, NODE_WIDTH, estimateNodeHeight } from "@/utils/project/multiProjectTaskFlow.utils";
import { parseAsLocalDate } from "@/utils/date.utils";
import { debugLog } from "@/hooks/debugLog/useDebugLog";

const transformTaskData = (dtos: TaskDTO[]): Task[] =>
    dtos.map((dto) => ({
        id: dto.id,
        projectId: dto.projectId,
        parentTaskId: dto.parentTaskId,
        type: dto.type,
        taskType: dto.taskType || "personal",
        title: dto.title,
        note: dto.note,
        status: dto.status,
        priority: dto.priority,
        startDate: parseAsLocalDate(dto.startDate),
        endDate: parseAsLocalDate(dto.endDate),
        orderIndex: dto.orderIndex,
        createdAt: parseAsLocalDate(dto.createdAt) || new Date(),
        updatedAt: parseAsLocalDate(dto.updatedAt),
        deletedAt: parseAsLocalDate(dto.deletedAt),
        folderWorkspaceItemId: dto.folderWorkspaceItemId,
        checklistJson: dto.checklistJson ?? null,
        processJson: dto.processJson ?? null,
        customTabsJson: dto.customTabsJson ?? null,
    }));

export const useMultiProjectTaskFlowHelper = () => {
    const { setFlowNodes, setFlowEdges, setEditingEdgeId, setSavedEdges, setDraggingNodeId, setSavedPositions, flowNodes, flowEdges, setConnectingSourceId, setTaskFlowTasks, setIsTaskFlowLoading, lockOldNodes } = useMultiTaskFlowStore();
    const { savedEdges } = useMultiProjectTaskFlowSelector();
    const { filteredProjectIds } = useMultiProjectDetailSelector();
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const reconnectingRef = useRef(false);
    // drag start positions for Shift-axis-constraint
    const dragStartRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    // locked axis per node: null = not yet decided, 'x' = locked horizontal, 'y' = locked vertical
    const dragAxisRef = useRef<Map<string, "x" | "y" | null>>(new Map());
    // last snapped positions applied by handleNodeDrag — restored at drop to avoid RF overwrite
    const lastSnappedRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    // ── Lock guards ────────────────────────────────────────────────────────
    const isNodeLocked = useCallback((nodeId: string): boolean => {
        if (!lockOldNodes) return false;
        const node = flowNodes.find((n) => n.id === nodeId);
        const status = (node?.data as TaskFlowNodeData)?.task?.status;
        return status === "completed" || status === "cancelled";
    }, [lockOldNodes, flowNodes]);

    const isEdgeLocked = useCallback((edgeId: string): boolean => {
        if (!lockOldNodes) return false;
        const edge = flowEdges.find((e) => e.id === edgeId);
        if (!edge) return false;
        return isNodeLocked(edge.source) || isNodeLocked(edge.target);
    }, [lockOldNodes, flowEdges, isNodeLocked]);

    // ── Node changes (drag/select) ──────────────────────────────────────────

    const handleNodesChange = useCallback(
        (changes: NodeChange[]) => {
            setFlowNodes((prev) => {
                // Build a set of locked node IDs for fast lookup
                const lockedIds = lockOldNodes
                    ? new Set(prev.filter((n) => { const s = (n.data as TaskFlowNodeData)?.task?.status; return s === "completed" || s === "cancelled"; }).map((n) => n.id))
                    : null;

                // Filter out position changes for locked nodes (allow select so miniBar viewDetail works)
                const filtered = lockedIds
                    ? changes.filter((c) => {
                        if (!("id" in c) || !lockedIds.has(c.id as string)) return true;
                        return c.type !== "position";
                    })
                    : changes;

                // Intercept final drop position changes (dragging: false) and substitute
                // the snapped position so React Flow's raw pointer position never lands in state
                const patched = filtered.map((c) => {
                    if (
                        c.type === "position" &&
                        c.dragging === false &&
                        c.id &&
                        lastSnappedRef.current.has(c.id)
                    ) {
                        return { ...c, position: lastSnappedRef.current.get(c.id)! };
                    }
                    return c;
                });
                return applyNodeChanges(patched, prev) as typeof prev;
            });
        },
        [setFlowNodes, lockOldNodes],
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
            dragStartRef.current.clear();
            dragAxisRef.current.clear();
            lastSnappedRef.current.clear();
            // Capture start positions for this node and all co-selected nodes
            setFlowNodes((prev) => {
                for (const n of prev) {
                    if (n.selected || n.id === node.id) {
                        dragStartRef.current.set(n.id, { ...n.position });
                        dragAxisRef.current.set(n.id, null);
                    }
                }
                return prev;
            });
        },
        [setDraggingNodeId, setFlowNodes],
    );

    // ── Live drag: center-snap + Shift axis constraint ─────────────────────

    const SNAP_THRESHOLD = 20;   // px — magnetic snap range
    const AXIS_LOCK_MIN  = 8;    // px — minimum movement before axis is decided

    const handleNodeDrag = useCallback(
        (event: React.MouseEvent, _node: { id: string }, draggedNodes: { id: string; position: { x: number; y: number } }[]) => {
            if (draggedNodes.length === 0) return;
            // Exclude locked nodes from drag calculation
            const activeDragged = lockOldNodes
                ? draggedNodes.filter((n) => !isNodeLocked(n.id))
                : draggedNodes;
            if (activeDragged.length === 0) return;
            const draggedIds = new Set(activeDragged.map((n) => n.id));
            const shiftHeld = event.shiftKey;

            setFlowNodes((prev) => {
                // Build a fast lookup of all non-dragged node centers using measured height
                const otherCenters: { cx: number; cy: number }[] = [];
                for (const n of prev) {
                    if (draggedIds.has(n.id)) continue;
                    const h = n.measured?.height ?? estimateNodeHeight((n.data as import("@/types/multiProject/multiProjectTaskFlow.type").TaskFlowNodeData).task);
                    otherCenters.push({ cx: n.position.x + NODE_WIDTH / 2, cy: n.position.y + h / 2 });
                }

                return prev.map((n) => {
                    if (!draggedIds.has(n.id)) return n;

                    const startPos = dragStartRef.current.get(n.id);
                    const h = n.measured?.height ?? estimateNodeHeight((n.data as import("@/types/multiProject/multiProjectTaskFlow.type").TaskFlowNodeData).task);
                    let { x, y } = n.position;

                    // ── 1. Center-snap (always on) — snap only the closer axis ──
                    const cx = x + NODE_WIDTH / 2;
                    const cy = y + h / 2;
                    let bestSnapCx: number | null = null;
                    let bestSnapCy: number | null = null;
                    let bestDx = SNAP_THRESHOLD;
                    let bestDy = SNAP_THRESHOLD;
                    for (const oc of otherCenters) {
                        const dx = Math.abs(cx - oc.cx);
                        const dy = Math.abs(cy - oc.cy);
                        if (dx < bestDx) { bestDx = dx; bestSnapCx = oc.cx; }
                        if (dy < bestDy) { bestDy = dy; bestSnapCy = oc.cy; }
                    }
                    // Only snap the axis that is closer to alignment — never both at once
                    if (bestSnapCx !== null && (bestSnapCy === null || bestDx <= bestDy)) {
                        x = bestSnapCx - NODE_WIDTH / 2;
                    } else if (bestSnapCy !== null) {
                        y = bestSnapCy - h / 2;
                    }

                    // ── 2. Shift axis constraint (overrides snap on locked axis) ─
                    if (shiftHeld && startPos) {
                        const totalDx = Math.abs(n.position.x - startPos.x);
                        const totalDy = Math.abs(n.position.y - startPos.y);

                        // Decide axis once movement exceeds AXIS_LOCK_MIN
                        let axis = dragAxisRef.current.get(n.id) ?? null;
                        if (axis === null && (totalDx > AXIS_LOCK_MIN || totalDy > AXIS_LOCK_MIN)) {
                            axis = totalDx >= totalDy ? "x" : "y";
                            dragAxisRef.current.set(n.id, axis);
                        }

                        if (axis === "x") y = startPos.y;  // horizontal drag → freeze Y
                        if (axis === "y") x = startPos.x;  // vertical drag   → freeze X
                    } else if (!shiftHeld) {
                        // Reset axis lock when Shift is released mid-drag
                        dragAxisRef.current.set(n.id, null);
                    }

                    lastSnappedRef.current.set(n.id, { x, y });
                    return { ...n, position: { x, y } };
                });
            });
        },
        [setFlowNodes, lockOldNodes, isNodeLocked],
    );

    const handleNodeDragStop = useCallback(
        (_event: React.MouseEvent, _node: { id: string }, draggedNodes: { id: string; position: { x: number; y: number } }[]) => {
            setDraggingNodeId(null);
            dragAxisRef.current.clear();
            if (draggedNodes.length === 0) return;

            // Filter out locked nodes — they shouldn't have their positions persisted
            const unlocked = draggedNodes.filter((n) => !isNodeLocked(n.id));
            if (unlocked.length < draggedNodes.length) {
                debugLog.log("taskflow", "locked-node-blocked", { action: "drag", lockedCount: draggedNodes.length - unlocked.length });
            }

            const draggedIds = new Set(unlocked.map((n) => n.id));
            const snapshotSnapped = new Map(lastSnappedRef.current);
            // Do NOT clear lastSnappedRef yet — handleNodesChange still needs it to intercept
            // the final position change that React Flow fires synchronously after this callback.
            // Clear it in the RAF after the interception has happened.

            requestAnimationFrame(() => {
                lastSnappedRef.current.clear();

                setFlowNodes((prev) => {
                    const posUpdate: Record<string, { x: number; y: number }> = {};
                    const payload: { nodeId: number; nodeType: string; x: number; y: number }[] = [];

                    const updated = prev.map((n) => {
                        if (!draggedIds.has(n.id)) return n;
                        const pos = snapshotSnapped.get(n.id) ?? n.position;
                        posUpdate[n.id] = pos;
                        const nodeId = parseInt(n.id, 10);
                        if (nodeId) payload.push({ nodeId, nodeType: "task", x: pos.x, y: pos.y });
                        return { ...n, position: pos, selected: true };
                    });

                    setSavedPositions((p) => ({ ...p, ...posUpdate }));
                    if (payload.length > 0) {
                        flowService._upsertPositions($user.userToken, payload).catch(() => {});
                    }
                    return updated;
                });
            });
        },
        [setDraggingNodeId, setFlowNodes, setSavedPositions, $user.userToken, isNodeLocked],
    );

    // ── Connection drag tracking ────────────────────────────────────────────

    const handleConnectStart = useCallback(
        (_: unknown, params: { nodeId?: string | null }) => {
            setConnectingSourceId(params.nodeId ?? null);
        },
        [setConnectingSourceId],
    );

    const handleConnectEnd = useCallback(() => {
        setConnectingSourceId(null);
    }, [setConnectingSourceId]);

    // ── Resolve handles: use RF value when explicit, compute nearest otherwise ─

    const resolveHandles = useCallback(
        (sourceId: string, targetId: string, sourceHandle?: string | null, targetHandle?: string | null) => {
            if (sourceHandle && targetHandle) return { sourceHandle, targetHandle };
            const srcNode = flowNodes.find((n) => n.id === sourceId);
            const tgtNode = flowNodes.find((n) => n.id === targetId);
            if (!srcNode || !tgtNode) return { sourceHandle: sourceHandle ?? "bottom", targetHandle: targetHandle ?? "top" };
            const srcH = srcNode.measured?.height ?? estimateNodeHeight((srcNode.data as import("@/types/multiProject/multiProjectTaskFlow.type").TaskFlowNodeData).task);
            const tgtH = tgtNode.measured?.height ?? estimateNodeHeight((tgtNode.data as import("@/types/multiProject/multiProjectTaskFlow.type").TaskFlowNodeData).task);
            const pair = nearestHandlePair(
                srcNode.position.x + NODE_WIDTH / 2, srcNode.position.y + srcH / 2,
                tgtNode.position.x + NODE_WIDTH / 2, tgtNode.position.y + tgtH / 2,
            );
            return {
                sourceHandle: sourceHandle ?? pair.sourceHandle,
                targetHandle: targetHandle ?? pair.targetHandle,
            };
        },
        [flowNodes],
    );

    // ── Custom edge connect ─────────────────────────────────────────────────

    const handleConnect = useCallback(
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
        },
        [$user.userToken, resolveHandles, setFlowEdges, setSavedEdges, _console, isNodeLocked],
    );

    // ── Edge note editing ───────────────────────────────────────────────────

    const handleEdgeNoteConfirm = useCallback(
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
        },
        [savedEdges, setFlowEdges, setSavedEdges, setEditingEdgeId, $user.userToken, _console, isEdgeLocked],
    );

    const handleEdgeDelete = useCallback(
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
        },
        [savedEdges, setFlowEdges, setSavedEdges, setEditingEdgeId, $user.userToken, _console, isEdgeLocked],
    );

    // ── Reconnect (drag edge endpoint to new node) ──────────────────────────

    const handleReconnectStart = useCallback(() => { reconnectingRef.current = true; }, []);
    const handleReconnectEnd = useCallback(() => { reconnectingRef.current = false; }, []);

    const handleReconnect = useCallback(
        async (oldEdge: Edge, newConnection: Connection) => {
            if (!newConnection.source || !newConnection.target) return;

            // Block if old edge is locked OR new target/source is locked
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
        },
        [resolveHandles, setFlowEdges, setSavedEdges, $user.userToken, _console, isEdgeLocked, isNodeLocked],
    );

    // ── Auto layout ─────────────────────────────────────────────────────────

    const handleAutoLayout = useCallback(() => {
        setFlowNodes((prev) => {
            const subEdges = savedEdges.map((e) => ({ source: e.source, target: e.target }));

            // Only reposition orphan nodes — connected nodes + their edges stay untouched
            // Also exclude locked nodes from repositioning
            const lockedIds = lockOldNodes
                ? new Set(prev.filter((n) => { const s = (n.data as TaskFlowNodeData)?.task?.status; return s === "completed" || s === "cancelled"; }).map((n) => n.id))
                : new Set<string>();
            const movable = prev.filter((n) => !lockedIds.has(n.id));
            const frozen = prev.filter((n) => lockedIds.has(n.id));
            const adjusted = smartWand(movable, subEdges);

            // Persist moved positions (skip temp nodes: id = NaN)
            const newPositions: Record<string, { x: number; y: number }> = {};
            const payload = adjusted
                .map((n) => { newPositions[n.id] = n.position; return { nodeId: parseInt(n.id, 10), nodeType: "task", x: n.position.x, y: n.position.y }; })
                .filter((p) => p.nodeId > 0);
            setSavedPositions((prev) => ({ ...prev, ...newPositions }));
            if (payload.length > 0) flowService._upsertPositions($user.userToken, payload).catch(() => {});

            return [...adjusted, ...frozen];
        });
    }, [savedEdges, setFlowNodes, setSavedPositions, $user.userToken, lockOldNodes]);

    const loadTaskFlowTasks = useCallback(async () => {
        if (!$user.userToken) return;
        setIsTaskFlowLoading(true);
        try {
            const result = await taskService._getTasks($user.userToken, { deletedAt: "null" });
            if (result.success && result.data) {
                setTaskFlowTasks(transformTaskData(result.data as TaskDTO[]));
            }
        } catch {
            _console.error("Failed to load task flow tasks");
        } finally {
            setIsTaskFlowLoading(false);
        }
    }, [$user.userToken, setTaskFlowTasks, setIsTaskFlowLoading, _console]);

    return {
        handleNodesChange,
        handleEdgesChange,
        handleNodeDragStart,
        handleNodeDrag,
        handleNodeDragStop,
        handleConnect,
        handleConnectStart,
        handleConnectEnd,
        handleReconnectStart,
        handleReconnectEnd,
        handleReconnect,
        handleEdgeNoteConfirm,
        handleEdgeDelete,
        handleAutoLayout,
        loadTaskFlowTasks,
        isNodeLocked,
        isEdgeLocked,
    };
};
