import React, { useRef } from "react";
import { applyNodeChanges } from "@xyflow/react";
import type { NodeChange, Node } from "@xyflow/react";
import { flowService } from "@/shared";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import type { KQFlowNodeData } from "@/features/K/types/kQFlow.type";

const NODE_W = 280;
const SNAP_THRESHOLD = 20;

export function useKQFlowDragHelper(
    selectionLockRef: React.RefObject<Set<string>>,
    lockSelection: (ids: string[]) => void,
) {
    const { setFlowNodes, setSavedPositions } = useKQFlowStore();

    const lastSnappedRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    // ── Node changes — applies snapped position when drag ends ────────────

    const handleNodesChange = (changes: NodeChange<Node<KQFlowNodeData>>[]) => {
        const locked = selectionLockRef.current;
        const filtered = locked && locked.size > 0
            ? changes.filter(c => !(c.type === "select" && !(c as { selected: boolean }).selected && locked.has((c as { id: string }).id)))
            : changes;
        const patched = filtered.map((c) => {
            if (c.type === "position" && c.dragging === false && c.id && lastSnappedRef.current.has(c.id))
                return { ...c, position: lastSnappedRef.current.get(c.id)! };
            return c;
        });
        setFlowNodes((prev) => applyNodeChanges(patched, prev) as Node<KQFlowNodeData>[]);
    };

    // ── Drag start — record start positions ───────────────────────────────

    const handleNodeDragStart = (_event: React.MouseEvent, node: Node) => {
        lastSnappedRef.current.clear();
        setFlowNodes((prev) => {
            for (const n of prev) {
                if (n.selected || n.id === node.id)
                    lastSnappedRef.current.set(n.id, { ...n.position });
            }
            return prev;
        });
    };

    // ── Live drag — snap center to nearest other node center ──────────────

    const handleNodeDrag = (_event: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
        if (draggedNodes.length === 0) return;
        const draggedIds = new Set(draggedNodes.map((n) => n.id));

        setFlowNodes((prev) => {
            const otherCenters: { cx: number; cy: number }[] = [];
            for (const n of prev) {
                if (draggedIds.has(n.id)) continue;
                const h = n.measured?.height ?? 120;
                otherCenters.push({ cx: n.position.x + NODE_W / 2, cy: n.position.y + h / 2 });
            }

            return prev.map((n) => {
                if (!draggedIds.has(n.id)) return n;
                const h = n.measured?.height ?? 120;
                let { x, y } = n.position;
                const cx = x + NODE_W / 2;
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
                    x = bestSnapCx - NODE_W / 2;
                } else if (bestSnapCy !== null) {
                    y = bestSnapCy - h / 2;
                }
                lastSnappedRef.current.set(n.id, { x, y });
                return { ...n, position: { x, y } };
            });
        });
    };

    // ── Drag stop — persist snapped positions ─────────────────────────────

    const handleNodeDragStop = (_event: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
        if (!draggedNodes.length) return;
        const draggedIds = new Set(draggedNodes.map((n) => n.id));
        lockSelection([...draggedIds]);
        const snapshotSnapped = new Map(lastSnappedRef.current);

        requestAnimationFrame(() => {
            lastSnappedRef.current.clear();
            setFlowNodes((prev) => {
                const posUpdate: Record<string, { x: number; y: number }> = {};
                const payload: { nodeId: number; nodeType: string; x: number; y: number }[] = [];
                const updated = prev.map((n) => {
                    if (!draggedIds.has(n.id) || n.id.startsWith("temp-node-")) return n;
                    const pos = snapshotSnapped.get(n.id) ?? n.position;
                    posUpdate[n.id] = pos;
                    const nodeId = parseInt(n.id, 10);
                    if (nodeId) payload.push({ nodeId, nodeType: "kQuestion", x: pos.x, y: pos.y });
                    return { ...n, position: pos, selected: true };
                });
                setSavedPositions((p) => ({ ...p, ...posUpdate }));
                if (payload.length > 0) flowService._upsertPositions("", payload).catch(() => {});
                return updated;
            });
        });
    };

    return { handleNodesChange, handleNodeDragStart, handleNodeDrag, handleNodeDragStop };
}
