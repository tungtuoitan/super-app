import { useEffect, useRef } from "react";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import type { NodeChange, EdgeChange, Connection, Edge, Node } from "@xyflow/react";
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

    // IDs whose deselect changes should be blocked (drag, Ctrl+X, etc.)
    const selectionLockRef = useRef<Set<string>>(new Set());
    const lockSelectionTimer = useRef<ReturnType<typeof setTimeout>>();

    /** Block ReactFlow deselect changes for the given node IDs for `ms` milliseconds. */
    const lockSelection = (ids: string[], ms = 400) => {
        ids.forEach(id => selectionLockRef.current.add(id));
        clearTimeout(lockSelectionTimer.current);
        lockSelectionTimer.current = setTimeout(() => selectionLockRef.current.clear(), ms);
    };

    // ── Node change / edge change ───────────────────────────────────────────

    const handleNodesChange = (changes: NodeChange<Node<KQFlowNodeData>>[]) => {
        const locked = selectionLockRef.current;
        const filtered = locked.size > 0
            ? changes.filter(c => !(c.type === 'select' && !(c as { type: 'select'; selected: boolean }).selected && locked.has((c as { type: 'select'; id: string }).id)))
            : changes;
        setFlowNodes((prev) => applyNodeChanges(filtered, prev) as Node<KQFlowNodeData>[]);
    };

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

    // ── Node drag stop — persist positions ─────────────────────────────────

    const handleNodeDragStop = (_event: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
        if (!draggedNodes.length) return;
        const draggedIds = new Set(draggedNodes.map((n) => n.id));
        lockSelection([...draggedIds]);

        requestAnimationFrame(() => {
            setFlowNodes((prev) => {
                const posUpdate: Record<string, { x: number; y: number }> = {};
                const payload: { nodeId: number; nodeType: string; x: number; y: number }[] = [];
                const updated = prev.map((n) => {
                    if (!draggedIds.has(n.id) || n.id.startsWith("temp-node-")) return n;
                    posUpdate[n.id] = n.position;
                    const nodeId = parseInt(n.id, 10);
                    if (nodeId) payload.push({ nodeId, nodeType: "kQuestion", x: n.position.x, y: n.position.y });
                    return { ...n, selected: true };
                });
                setSavedPositions((p) => ({ ...p, ...posUpdate }));
                if (payload.length > 0) flowService._upsertPositions("", payload).catch(() => {});
                return updated;
            });
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
        lockSelection,
        handleNodesChange, handleEdgesChange,
        handleNodeDragStop,
        handleConnect, handleEdgeDelete, handleEdgeToggleDirection,
        handleConnectStart, handleConnectEnd,
        handleReconnect, handleReconnectStart, handleReconnectEnd,
    };
}
