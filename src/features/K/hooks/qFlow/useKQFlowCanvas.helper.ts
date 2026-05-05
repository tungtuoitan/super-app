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

    // ── Organize: topo-layered layout (left→right) + anti-overlap edges ──

    const handleOrganize = (nodeIds: string[]) => {
        if (nodeIds.length < 2) return;
        const nodes = flowNodesRef.current.filter((n) => nodeIds.includes(n.id));
        if (nodes.length < 2) return;
        const NODE_W = 280; const GAP_X = 64; const GAP_Y = 48;
        const nodeIdSet = new Set(nodeIds);
        const minX = Math.min(...nodes.map((n) => n.position.x));
        const minY = Math.min(...nodes.map((n) => n.position.y));
        const relevantEdges = savedEdgesRef.current.filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));
        const newPositions = new Map<string, { x: number; y: number; h: number }>();

        if (relevantEdges.length === 0) {
            // No edges → near-square grid (fallback)
            const cols = Math.ceil(Math.sqrt(nodes.length));
            const sorted = [...nodes].sort((a, b) => Math.abs(a.position.y - b.position.y) > 50 ? a.position.y - b.position.y : a.position.x - b.position.x);
            const rows = Math.ceil(sorted.length / cols);
            const rowH = Array.from({ length: rows }, (_, r) => { let m = 0; for (let c = 0; c < cols; c++) m = Math.max(m, sorted[r * cols + c]?.measured?.height ?? 120); return m; });
            const rowOff = rowH.reduce<number[]>((a, _, i) => { a.push(i === 0 ? 0 : a[i - 1] + rowH[i - 1] + GAP_Y); return a; }, []);
            sorted.forEach((n, idx) => {
                const row = Math.floor(idx / cols); const col = idx % cols; const h = n.measured?.height ?? 120;
                newPositions.set(n.id, { x: minX + col * (NODE_W + GAP_X), y: minY + rowOff[row] + (rowH[row] - h) / 2, h });
            });
        } else {
            // ── Directed adjacency (respects arrowDirection) ──────────────
            const adj = new Map<string, string[]>();
            const revAdj = new Map<string, string[]>();
            for (const n of nodes) { adj.set(n.id, []); revAdj.set(n.id, []); }
            for (const e of relevantEdges) {
                const dir = e.data?.arrowDirection ?? 'forward';
                const [src, tgt] = dir === 'backward' ? [e.target, e.source] : [e.source, e.target];
                if (!adj.has(src) || !adj.has(tgt)) continue;
                adj.get(src)!.push(tgt);
                revAdj.get(tgt)!.push(src);
            }

            // ── DFS topo sort → longest-path rank (= column index) ───────
            const visited = new Set<string>();
            const inStack = new Set<string>();
            const topoOrder: string[] = [];
            const dfs = (id: string) => {
                if (visited.has(id) || inStack.has(id)) return;
                inStack.add(id);
                for (const nxt of adj.get(id) ?? []) dfs(nxt);
                inStack.delete(id);
                visited.add(id);
                topoOrder.unshift(id);
            };
            for (const n of nodes) dfs(n.id);

            const rank = new Map<string, number>();
            for (const id of topoOrder) {
                const preds = revAdj.get(id) ?? [];
                rank.set(id, preds.length === 0 ? 0 : Math.max(...preds.map((p) => (rank.get(p) ?? 0) + 1)));
            }

            // ── Group by rank (column), sort within rank by original Y ────
            const rankGroups = new Map<number, typeof nodes>();
            for (const n of nodes) {
                const r = rank.get(n.id) ?? 0;
                if (!rankGroups.has(r)) rankGroups.set(r, []);
                rankGroups.get(r)!.push(n);
            }
            for (const grp of rankGroups.values()) grp.sort((a, b) => a.position.y - b.position.y);

            // ── Assign positions: rank = column (x), stack vertically (y) ─
            for (const [r, grp] of [...rankGroups.entries()].sort(([a], [b]) => a - b)) {
                const x = minX + r * (NODE_W + GAP_X);
                let y = minY;
                for (const n of grp) {
                    const h = n.measured?.height ?? 120;
                    newPositions.set(n.id, { x, y, h });
                    y += h + GAP_Y;
                }
            }
        }

        // ── Persist node positions ────────────────────────────────────────
        const posUpdate: Record<string, { x: number; y: number }> = {};
        const posPayload: { nodeId: number; nodeType: string; x: number; y: number }[] = [];
        setFlowNodes((prev) =>
            prev.map((n) => {
                const p = newPositions.get(n.id);
                if (!p) return n;
                posUpdate[n.id] = { x: p.x, y: p.y };
                const nodeId = parseInt(n.id, 10);
                if (nodeId) posPayload.push({ nodeId, nodeType: 'kQuestion', x: p.x, y: p.y });
                return { ...n, position: { x: p.x, y: p.y } };
            }),
        );
        setSavedPositions((prev) => ({ ...prev, ...posUpdate }));
        if (posPayload.length > 0) flowService._upsertPositions('', posPayload).catch(() => {});

        // ── Reoptimize edge handles ───────────────────────────────────────
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
                ? (dx >= 0 ? { sourceHandle: 'right', targetHandle: 'left' } : { sourceHandle: 'left', targetHandle: 'right' })
                : (dy >= 0 ? { sourceHandle: 'bottom', targetHandle: 'top' } : { sourceHandle: 'top', targetHandle: 'bottom' });
        };

        // Primary handle for every edge
        const edgeHandleMap = new Map<string, { sourceHandle: string; targetHandle: string }>();
        for (const edge of edgesToUpdate) {
            const h = resolveFromNew(edge.source, edge.target);
            if (h) edgeHandleMap.set(edge.id, h);
        }

        // ── Anti-overlap: separate opposing / duplicate edge pairs ────────
        const isHoriz = (h: { sourceHandle: string }) =>
            h.sourceHandle === 'left' || h.sourceHandle === 'right';

        // Rank from x position (works for both grid and layered paths)
        const rankMap = new Map<string, number>();
        for (const [id, pos] of newPositions)
            rankMap.set(id, Math.round((pos.x - minX) / (NODE_W + GAP_X)));

        const pairGroups = new Map<string, string[]>();
        for (const edge of edgesToUpdate) {
            const key = [edge.source, edge.target].sort().join('|||');
            if (!pairGroups.has(key)) pairGroups.set(key, []);
            pairGroups.get(key)!.push(edge.id);
        }

        for (const ids of pairGroups.values()) {
            if (ids.length < 2) continue;
            const fwd: string[] = [], bwd: string[] = [];
            for (const eid of ids) {
                const e = edgesToUpdate.find((x) => x.id === eid)!;
                const dir = e.data?.arrowDirection ?? 'forward';
                const lSrc = dir === 'backward' ? e.target : e.source;
                const lTgt = dir === 'backward' ? e.source : e.target;
                ((rankMap.get(lSrc) ?? 0) <= (rankMap.get(lTgt) ?? 0) ? fwd : bwd).push(eid);
            }
            const toSep = bwd.length > 0 ? bwd : ids.slice(1);
            const refH = edgeHandleMap.get(fwd.length > 0 ? fwd[0] : ids[0]);
            if (!refH) continue;
            for (const eid of toSep) {
                const h = edgeHandleMap.get(eid);
                if (!h) continue;
                // Same axis → route the back/extra edge via same-side handle (curves around)
                if (isHoriz(refH) && isHoriz(h)) edgeHandleMap.set(eid, { sourceHandle: 'bottom', targetHandle: 'bottom' });
                else if (!isHoriz(refH) && !isHoriz(h)) edgeHandleMap.set(eid, { sourceHandle: 'right', targetHandle: 'right' });
            }
        }

        // ── Persist edge handle changes ───────────────────────────────────
        const edgeUpdateMap = new Map<string, { sourceHandle: string; targetHandle: string }>();
        const edgePayload: { id: number; sourceId: number; targetId: number; sourceHandle: string; targetHandle: string }[] = [];
        for (const edge of edgesToUpdate) {
            const handles = edgeHandleMap.get(edge.id);
            if (!handles) continue;
            if (handles.sourceHandle === edge.sourceHandle && handles.targetHandle === edge.targetHandle) continue;
            edgeUpdateMap.set(edge.id, handles);
            const backendId = edge.data?.edgeId;
            if (backendId) edgePayload.push({
                id: backendId, sourceId: parseInt(edge.source, 10), targetId: parseInt(edge.target, 10), ...handles,
            });
        }
        if (edgeUpdateMap.size > 0) {
            const applyUpdates = (prev: Edge<KFlowEdgeData>[]) =>
                prev.map((e) => { const upd = edgeUpdateMap.get(e.id); return upd ? { ...e, ...upd } : e; });
            setFlowEdges(applyUpdates);
            setSavedEdges(applyUpdates);
            if (edgePayload.length > 0) flowService._upsertEdges('', edgePayload).catch(() => {});
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
