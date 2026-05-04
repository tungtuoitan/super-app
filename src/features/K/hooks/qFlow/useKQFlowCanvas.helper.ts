import { useEffect, useRef } from "react";
import { applyEdgeChanges, addEdge } from "@xyflow/react";
import type { EdgeChange, Connection, Edge, Node } from "@xyflow/react";
import { flowService } from "@/shared";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import type { KFlowEdgeData, KQFlowNodeData, ArrowDirection } from "@/features/K/types/kQFlow.type";

export function useKQFlowCanvasHelper() {
    const {
        flowNodes, setFlowNodes,
        flowEdges, setFlowEdges,
        savedEdges, setSavedEdges,
        setSavedPositions,
        setConnectingSourceId,
    } = useKQFlowStore();

    const savedEdgesRef = useRef(savedEdges);
    const flowNodesRef = useRef(flowNodes);

    useEffect(() => { savedEdgesRef.current = savedEdges; }, [savedEdges]);
    useEffect(() => { flowNodesRef.current = flowNodes; }, [flowNodes]);

    const reconnectingRef = useRef(false);

    // IDs whose deselect changes should be blocked — shared with useKQFlowDragHelper
    const selectionLockRef = useRef<Set<string>>(new Set());
    const lockSelectionTimer = useRef<ReturnType<typeof setTimeout>>();

    const lockSelection = (ids: string[], ms = 400) => {
        ids.forEach(id => selectionLockRef.current.add(id));
        clearTimeout(lockSelectionTimer.current);
        lockSelectionTimer.current = setTimeout(() => selectionLockRef.current.clear(), ms);
    };

    // ── Edge change ────────────────────────────────────────────────────────

    const handleEdgesChange = (changes: EdgeChange<Edge<KFlowEdgeData>>[]) => {
        setFlowEdges((prev) => {
            if (reconnectingRef.current) return prev;
            const updated = applyEdgeChanges(changes, prev) as Edge<KFlowEdgeData>[];
            const hasSelectChange = changes.some((c) => c.type === 'select');
            if (!hasSelectChange) return updated;
            return updated.map((e) =>
                e.type === 'kQuestionEdge' ? { ...e, reconnectable: !!e.selected } : e,
            );
        });
    };

    // ── Resolve nearest handle pair when connecting ────────────────────────

    const resolveHandles = (
        sourceId: string, targetId: string,
        sourceHandle?: string | null, targetHandle?: string | null,
    ) => {
        if (sourceHandle && targetHandle) return { sourceHandle, targetHandle };
        const srcNode = flowNodesRef.current.find((n) => n.id === sourceId);
        const tgtNode = flowNodesRef.current.find((n) => n.id === targetId);
        if (!srcNode || !tgtNode) return { sourceHandle: sourceHandle ?? "bottom", targetHandle: targetHandle ?? "top" };
        const W = 280;
        const srcH = srcNode.measured?.height ?? 120;
        const tgtH = tgtNode.measured?.height ?? 120;
        const dx = (tgtNode.position.x + W / 2) - (srcNode.position.x + W / 2);
        const dy = (tgtNode.position.y + tgtH / 2) - (srcNode.position.y + srcH / 2);
        const pair = Math.abs(dx) >= Math.abs(dy)
            ? (dx >= 0 ? { sourceHandle: "right", targetHandle: "left" } : { sourceHandle: "left", targetHandle: "right" })
            : (dy >= 0 ? { sourceHandle: "bottom", targetHandle: "top" } : { sourceHandle: "top", targetHandle: "bottom" });
        return { sourceHandle: sourceHandle ?? pair.sourceHandle, targetHandle: targetHandle ?? pair.targetHandle };
    };

    // ── Edge connect — persist ─────────────────────────────────────────────

    const handleConnect = async (connection: Connection) => {
        if (!connection.source || !connection.target) return;
        if (connection.source.startsWith("temp-node-") || connection.target.startsWith("temp-node-")) return;

        const { sourceHandle, targetHandle } = resolveHandles(
            connection.source, connection.target,
            connection.sourceHandle, connection.targetHandle,
        );

        const tempId = `temp-edge-${Date.now()}`;
        const newEdge: Edge<KFlowEdgeData> = {
            id: tempId, source: connection.source, target: connection.target,
            sourceHandle, targetHandle,
            type: "kQuestionEdge",
            data: { edgeId: 0, note: null, arrowDirection: "forward" },
        };
        setFlowEdges((prev) => addEdge(newEdge, prev) as Edge<KFlowEdgeData>[]);

        try {
            const result = await flowService._upsertEdges("", [{
                sourceId: parseInt(connection.source, 10), sourceType: "kQuestion",
                sourceHandle,
                targetId: parseInt(connection.target, 10), targetType: "kQuestion",
                targetHandle, note: null,
            }]);
            if (!result.success) throw new Error();
            const saved = (result.data as { id: number }[])?.[0];
            if (!saved?.id) throw new Error();
            const persisted: Edge<KFlowEdgeData> = { ...newEdge, id: `custom-${saved.id}`, data: { edgeId: saved.id, note: null, arrowDirection: "forward" } };
            setFlowEdges((prev) => prev.map((e) => (e.id === tempId ? persisted : e)));
            setSavedEdges((prev) => [...prev, persisted]);
        } catch {
            setFlowEdges((prev) => prev.filter((e) => e.id !== tempId));
        }
    };

    // ── Edge delete ────────────────────────────────────────────────────────

    const handleEdgeDelete = async (edgeId: string) => {
        const edge = savedEdgesRef.current.find((e) => e.id === edgeId);
        setFlowEdges((prev) => prev.filter((e) => e.id !== edgeId));
        setSavedEdges((prev) => prev.filter((e) => e.id !== edgeId));
        const backendId = edge?.data?.edgeId;
        if (!backendId) return;
        try {
            await flowService._upsertEdges("", [{
                id: backendId,
                sourceId: parseInt(edge!.source, 10), targetId: parseInt(edge!.target, 10),
                sourceHandle: edge!.sourceHandle ?? "bottom",
                targetHandle: edge!.targetHandle ?? "top",
                deletedAt: new Date().toISOString(),
            }]);
        } catch { /* silent */ }
    };

    // ── Organize selected nodes into a grid ───────────────────────────────

    const handleOrganize = (nodeIds: string[]) => {
        if (nodeIds.length < 2) return;
        const nodes = flowNodesRef.current.filter((n) => nodeIds.includes(n.id));
        if (nodes.length < 2) return;

        const NODE_W = 280;
        const GAP_X = 64;
        const GAP_Y = 48;
        const cols = Math.ceil(Math.sqrt(nodes.length));

        // Sort by reading order: top → bottom, left → right (50px y-tolerance)
        const sorted = [...nodes].sort((a, b) => {
            const yDiff = a.position.y - b.position.y;
            if (Math.abs(yDiff) > 50) return yDiff;
            return a.position.x - b.position.x;
        });

        // Anchor at top-left of current bounding box
        const minX = Math.min(...nodes.map((n) => n.position.x));
        const minY = Math.min(...nodes.map((n) => n.position.y));

        // Row heights = max measured height per row
        const rows = Math.ceil(sorted.length / cols);
        const rowHeights: number[] = Array.from({ length: rows }, (_, r) => {
            let maxH = 0;
            for (let c = 0; c < cols; c++) {
                const h = sorted[r * cols + c]?.measured?.height ?? 120;
                if (h > maxH) maxH = h;
            }
            return maxH;
        });

        // Cumulative row offsets
        const rowOffsets: number[] = [0];
        for (let r = 0; r < rows - 1; r++) {
            rowOffsets.push(rowOffsets[r] + rowHeights[r] + GAP_Y);
        }

        // Compute new positions up-front (needed for edge handle resolution)
        const newPositions = new Map<string, { x: number; y: number; h: number }>();
        sorted.forEach((n, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const h = n.measured?.height ?? 120;
            newPositions.set(n.id, {
                x: minX + col * (NODE_W + GAP_X),
                y: minY + rowOffsets[row] + (rowHeights[row] - h) / 2,
                h,
            });
        });

        // ── Update node positions ──────────────────────────────────────────
        const posUpdate: Record<string, { x: number; y: number }> = {};
        const posPayload: { nodeId: number; nodeType: string; x: number; y: number }[] = [];

        setFlowNodes((prev) =>
            prev.map((n) => {
                const p = newPositions.get(n.id);
                if (!p) return n;
                posUpdate[n.id] = { x: p.x, y: p.y };
                const nodeId = parseInt(n.id, 10);
                if (nodeId) posPayload.push({ nodeId, nodeType: "kQuestion", x: p.x, y: p.y });
                return { ...n, position: { x: p.x, y: p.y } };
            }),
        );

        setSavedPositions((prev) => ({ ...prev, ...posUpdate }));
        if (posPayload.length > 0) flowService._upsertPositions("", posPayload).catch(() => {});

        // ── Reoptimize edges between organized nodes ───────────────────────
        const nodeIdSet = new Set(nodeIds);
        const edgesToUpdate = savedEdgesRef.current.filter(
            (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target),
        );
        if (edgesToUpdate.length === 0) return;

        const resolveFromNew = (srcId: string, tgtId: string) => {
            const src = newPositions.get(srcId);
            const tgt = newPositions.get(tgtId);
            if (!src || !tgt) return null;
            const dx = (tgt.x + NODE_W / 2) - (src.x + NODE_W / 2);
            const dy = (tgt.y + tgt.h / 2) - (src.y + src.h / 2);
            return Math.abs(dx) >= Math.abs(dy)
                ? (dx >= 0 ? { sourceHandle: "right", targetHandle: "left" } : { sourceHandle: "left", targetHandle: "right" })
                : (dy >= 0 ? { sourceHandle: "bottom", targetHandle: "top" } : { sourceHandle: "top", targetHandle: "bottom" });
        };

        const edgeUpdateMap = new Map<string, { sourceHandle: string; targetHandle: string }>();
        const edgePayload: { id: number; sourceId: number; targetId: number; sourceHandle: string; targetHandle: string }[] = [];

        edgesToUpdate.forEach((edge) => {
            const handles = resolveFromNew(edge.source, edge.target);
            if (!handles) return;
            if (handles.sourceHandle === edge.sourceHandle && handles.targetHandle === edge.targetHandle) return;
            edgeUpdateMap.set(edge.id, handles);
            const backendId = edge.data?.edgeId;
            if (backendId) edgePayload.push({
                id: backendId,
                sourceId: parseInt(edge.source, 10),
                targetId: parseInt(edge.target, 10),
                ...handles,
            });
        });

        if (edgeUpdateMap.size > 0) {
            const applyUpdates = (prev: Edge<KFlowEdgeData>[]) =>
                prev.map((e) => { const upd = edgeUpdateMap.get(e.id); return upd ? { ...e, ...upd } : e; });
            setFlowEdges(applyUpdates);
            setSavedEdges(applyUpdates);
            if (edgePayload.length > 0) flowService._upsertEdges("", edgePayload).catch(() => {});
        }
    };

    // ── Edge reoptimize handles (double-click) ────────────────────────────

    const handleEdgeReoptimize = async (edgeId: string) => {
        const edge = savedEdgesRef.current.find((e) => e.id === edgeId);
        if (!edge) return;
        const { sourceHandle, targetHandle } = resolveHandles(edge.source, edge.target, null, null);
        if (sourceHandle === edge.sourceHandle && targetHandle === edge.targetHandle) return;
        const updatedEdge: Edge<KFlowEdgeData> = { ...edge, sourceHandle, targetHandle };
        setFlowEdges((prev) => prev.map((e) => e.id === edgeId ? updatedEdge : e));
        setSavedEdges((prev) => prev.map((e) => e.id === edgeId ? updatedEdge : e));
        const backendId = edge.data?.edgeId;
        if (!backendId) return;
        try {
            await flowService._upsertEdges('', [{
                id: backendId,
                sourceId: parseInt(edge.source, 10), targetId: parseInt(edge.target, 10),
                sourceHandle, targetHandle,
            }]);
        } catch { /* silent */ }
    };

    // ── Edge direction toggle ─────────────────────────────────────────────

    const handleEdgeToggleDirection = async (edgeId: string, nextDir: ArrowDirection) => {
        const update = (prev: Edge<KFlowEdgeData>[]) =>
            prev.map((e) => e.id === edgeId ? { ...e, data: { ...(e.data as KFlowEdgeData), arrowDirection: nextDir } } : e);
        setFlowEdges(update);
        setSavedEdges(update);

        const edge = savedEdgesRef.current.find((e) => e.id === edgeId);
        const backendId = edge?.data?.edgeId;
        if (!backendId) return;
        try {
            await flowService._upsertEdges("", [{
                id: backendId,
                sourceId: parseInt(edge!.source, 10), targetId: parseInt(edge!.target, 10),
                arrowDirection: nextDir,
            }]);
        } catch { /* silent */ }
    };

    // ── Connection tracking ────────────────────────────────────────────────

    const handleConnectStart = (_: unknown, params: { nodeId?: string | null }) =>
        setConnectingSourceId(params.nodeId ?? null);

    const handleConnectEnd = () => setConnectingSourceId(null);

    // ── Reconnect (drag edge endpoint to new node) ─────────────────────────

    const handleReconnectStart = () => { reconnectingRef.current = true; };
    const handleReconnectEnd = () => {
        setTimeout(() => { reconnectingRef.current = false; }, 80);
    };

    const handleReconnect = async (oldEdge: Edge<KFlowEdgeData>, newConnection: Connection) => {
        if (!newConnection.source || !newConnection.target) return;
        if (newConnection.source.startsWith('temp-node-') || newConnection.target.startsWith('temp-node-')) return;

        const { sourceHandle, targetHandle } = resolveHandles(
            newConnection.source, newConnection.target,
            newConnection.sourceHandle, newConnection.targetHandle,
        );

        const updatedEdge: Edge<KFlowEdgeData> = {
            ...oldEdge,
            source: newConnection.source, target: newConnection.target,
            sourceHandle, targetHandle,
            reconnectable: true,
        };
        setFlowEdges((prev) => prev.map((e: Edge<KFlowEdgeData>) => e.id === oldEdge.id ? updatedEdge : e));
        setSavedEdges((prev) => prev.map((e: Edge<KFlowEdgeData>) => e.id === oldEdge.id ? updatedEdge : e));

        const backendId = oldEdge.data?.edgeId;
        if (!backendId) return;
        try {
            await flowService._upsertEdges('', [{
                id: backendId,
                sourceId: parseInt(newConnection.source, 10), sourceType: 'kQuestion', sourceHandle,
                targetId: parseInt(newConnection.target, 10), targetType: 'kQuestion', targetHandle,
            }]);
        } catch { /* silent */ }
    };

    return {
        selectionLockRef,
        lockSelection,
        handleEdgesChange,
        handleConnect, handleEdgeDelete, handleEdgeToggleDirection, handleEdgeReoptimize,
        handleOrganize,
        handleConnectStart, handleConnectEnd,
        handleReconnect, handleReconnectStart, handleReconnectEnd,
    };
}
