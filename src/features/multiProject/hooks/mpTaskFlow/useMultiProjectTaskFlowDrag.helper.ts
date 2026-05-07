/**
 * MultiProject Task Flow Drag Helper
 * Node drag callbacks: drag start/move/stop with center-snap and Shift-axis-constraint.
 * Also owns handleNodesChange because it shares lastSnappedRef.
 */

import { useRef } from "react";
import { applyNodeChanges } from "@xyflow/react";
import type { NodeChange } from "@xyflow/react";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowHelper } from "./useMultiProjectTaskFlow.helper";
import { useAuthStore } from "@/shared";
import { flowService } from "@/shared";
import { useDebugLog } from "@/shared";
import type { TaskFlowNodeData } from "../../types/multiProjectTaskFlow.type";
import { estimateNodeHeight, NODE_WIDTH } from "../../utils/multiProjectTaskFlow.utils";

const SNAP_THRESHOLD = 20;
const AXIS_LOCK_MIN = 8;

export const useMultiProjectTaskFlowDragHelper = () => {
    const { setFlowNodes, setDraggingNodeId, setSavedPositions, lockOldNodes } = useMultiTaskFlowStore();
    const { isNodeLocked } = useMultiProjectTaskFlowHelper();
    const { $user } = useAuthStore();
    const debugLog = useDebugLog();

    const dragStartRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const dragAxisRef = useRef<Map<string, "x" | "y" | null>>(new Map());
    const lastSnappedRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const selectionLockRef = useRef<Set<string>>(new Set());
    const selectionLockTimer = useRef<ReturnType<typeof setTimeout>>();

    const lockSelection = (ids: string[], ms = 400) => {
        ids.forEach(id => selectionLockRef.current.add(id));
        clearTimeout(selectionLockTimer.current);
        selectionLockTimer.current = setTimeout(() => selectionLockRef.current.clear(), ms);
    };

    // ── Node changes — must live here to share lastSnappedRef ──────────────

    const handleNodesChange =
        (changes: NodeChange[]) => {
            const locked = selectionLockRef.current;
            const afterDeselectLock = locked.size > 0
                ? changes.filter(c => !(c.type === "select" && !(c as { selected: boolean }).selected && locked.has((c as { id: string }).id)))
                : changes;

            setFlowNodes((prev) => {
                const lockedIds = lockOldNodes
                    ? new Set(prev.filter((n) => { const s = (n.data as TaskFlowNodeData)?.task?.status; return s === "completed" || s === "cancelled" || s === "failed"; }).map((n) => n.id))
                    : null;

                const filtered = lockedIds
                    ? afterDeselectLock.filter((c) => {
                        if (!("id" in c) || !lockedIds.has(c.id as string)) return true;
                        return c.type !== "position";
                    })
                    : afterDeselectLock;

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
        }

    // ── Drag start ─────────────────────────────────────────────────────────

    const handleNodeDragStart =
        (_event: React.MouseEvent, node: { id: string }) => {
            setDraggingNodeId(node.id);
            dragStartRef.current.clear();
            dragAxisRef.current.clear();
            lastSnappedRef.current.clear();
            setFlowNodes((prev) => {
                for (const n of prev) {
                    if (n.selected || n.id === node.id) {
                        dragStartRef.current.set(n.id, { ...n.position });
                        dragAxisRef.current.set(n.id, null);
                    }
                }
                return prev;
            });
        }

    // ── Live drag: center-snap + Shift axis constraint ─────────────────────

    const handleNodeDrag =
        (event: React.MouseEvent, _node: { id: string }, draggedNodes: { id: string; position: { x: number; y: number } }[]) => {
            if (draggedNodes.length === 0) return;
            const activeDragged = lockOldNodes
                ? draggedNodes.filter((n) => !isNodeLocked(n.id))
                : draggedNodes;
            if (activeDragged.length === 0) return;
            const draggedIds = new Set(activeDragged.map((n) => n.id));
            const shiftHeld = event.shiftKey;

            setFlowNodes((prev) => {
                const otherCenters: { cx: number; cy: number }[] = [];
                for (const n of prev) {
                    if (draggedIds.has(n.id)) continue;
                    const h = n.measured?.height ?? estimateNodeHeight((n.data as TaskFlowNodeData).task);
                    otherCenters.push({ cx: n.position.x + NODE_WIDTH / 2, cy: n.position.y + h / 2 });
                }

                return prev.map((n) => {
                    if (!draggedIds.has(n.id)) return n;

                    const startPos = dragStartRef.current.get(n.id);
                    const h = n.measured?.height ?? estimateNodeHeight((n.data as TaskFlowNodeData).task);
                    let { x, y } = n.position;

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
                    if (bestSnapCx !== null && (bestSnapCy === null || bestDx <= bestDy)) {
                        x = bestSnapCx - NODE_WIDTH / 2;
                    } else if (bestSnapCy !== null) {
                        y = bestSnapCy - h / 2;
                    }

                    if (shiftHeld && startPos) {
                        const totalDx = Math.abs(n.position.x - startPos.x);
                        const totalDy = Math.abs(n.position.y - startPos.y);

                        let axis = dragAxisRef.current.get(n.id) ?? null;
                        if (axis === null && (totalDx > AXIS_LOCK_MIN || totalDy > AXIS_LOCK_MIN)) {
                            axis = totalDx >= totalDy ? "x" : "y";
                            dragAxisRef.current.set(n.id, axis);
                        }

                        if (axis === "x") y = startPos.y;
                        if (axis === "y") x = startPos.x;
                    } else if (!shiftHeld) {
                        dragAxisRef.current.set(n.id, null);
                    }

                    lastSnappedRef.current.set(n.id, { x, y });
                    return { ...n, position: { x, y } };
                });
            });
        }

    // ── Drag stop — persist positions ──────────────────────────────────────

    const handleNodeDragStop =
        (_event: React.MouseEvent, _node: { id: string }, draggedNodes: { id: string; position: { x: number; y: number } }[]) => {
            setDraggingNodeId(null);
            dragAxisRef.current.clear();
            if (draggedNodes.length === 0) return;

            const unlocked = draggedNodes.filter((n) => !isNodeLocked(n.id));
            if (unlocked.length < draggedNodes.length) {
                debugLog.log("taskflow", "locked-node-blocked", { action: "drag", lockedCount: draggedNodes.length - unlocked.length });
            }

            const draggedIds = new Set(unlocked.map((n) => n.id));
            lockSelection([...draggedIds]);
            const snapshotSnapped = new Map(lastSnappedRef.current);

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
        }

    return {
        handleNodesChange,
        handleNodeDragStart,
        handleNodeDrag,
        handleNodeDragStop,
    };
};
