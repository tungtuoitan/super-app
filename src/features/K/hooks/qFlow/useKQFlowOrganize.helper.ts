import type { MutableRefObject } from "react";
import type { Edge, Node } from "@xyflow/react";
import { flowService } from "@/shared";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import type { KFlowEdgeData, KQFlowNodeData } from "@/features/K/types/kQFlow.type";

export function useKQFlowOrganizeHelper(
    flowNodesRef: MutableRefObject<Node<KQFlowNodeData>[]>,
    savedEdgesRef: MutableRefObject<Edge<KFlowEdgeData>[]>,
) {
    const { setFlowNodes, setFlowEdges, setSavedEdges, setSavedPositions } = useKQFlowStore();

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

        // ── Sort: topo rank (if edges exist) or reading order ────────────
        let sorted: typeof nodes;

        if (relevantEdges.length > 0) {
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
            sorted = [...nodes].sort((a, b) => {
                const ra = rank.get(a.id) ?? 0;
                const rb = rank.get(b.id) ?? 0;
                if (ra !== rb) return ra - rb;
                return a.position.y - b.position.y;
            });
        } else {
            sorted = [...nodes].sort((a, b) =>
                Math.abs(a.position.y - b.position.y) > 50 ? a.position.y - b.position.y : a.position.x - b.position.x
            );
        }

        // ── Snake grid: row 0 left→right, row 1 right→left, row 2 left→right, …
        //    Keeps consecutive nodes adjacent across row boundaries (short edges).
        const cols = Math.ceil(Math.sqrt(sorted.length));
        const rows = Math.ceil(sorted.length / cols);
        const rowH = Array.from({ length: rows }, (_, r) => { let m = 0; for (let c = 0; c < cols; c++) m = Math.max(m, sorted[r * cols + c]?.measured?.height ?? 120); return m; });
        const rowOff = rowH.reduce<number[]>((a, _, i) => { a.push(i === 0 ? 0 : a[i - 1] + rowH[i - 1] + GAP_Y); return a; }, []);
        const nodeGridPos = new Map<string, { row: number; col: number }>();
        sorted.forEach((n, idx) => {
            const row = Math.floor(idx / cols);
            const col = row % 2 === 1 ? (cols - 1 - (idx % cols)) : (idx % cols);
            const h = n.measured?.height ?? 120;
            newPositions.set(n.id, { x: minX + col * (NODE_W + GAP_X), y: minY + rowOff[row] + (rowH[row] - h) / 2, h });
            nodeGridPos.set(n.id, { row, col });
        });

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

        // ── Anti-containment: edge A must not be fully inside edge B ─────
        // Happens when src→t1 and src→t2 share a source AND t1 is between src and t2
        // (or shared target with source between). Reroute the contained (shorter) edge.
        const logicalEnds = (e: Edge<KFlowEdgeData>) => {
            const dir = e.data?.arrowDirection ?? 'forward';
            return dir === 'backward'
                ? { lSrc: e.target, lTgt: e.source }
                : { lSrc: e.source, lTgt: e.target };
        };

        const fixContained = (
            sharedId: string, eid1: string, other1: string, eid2: string, other2: string,
        ) => {
            const sg = nodeGridPos.get(sharedId);
            const g1 = nodeGridPos.get(other1);
            const g2 = nodeGridPos.get(other2);
            if (!sg || !g1 || !g2) return;
            const h1 = edgeHandleMap.get(eid1);
            const h2 = edgeHandleMap.get(eid2);
            if (!h1 || !h2 || h1.sourceHandle !== h2.sourceHandle || h1.targetHandle !== h2.targetHandle) return;
            // Same row → horizontal containment
            if (sg.row === g1.row && sg.row === g2.row) {
                if ((sg.col < g1.col && g1.col < g2.col) || (sg.col > g1.col && g1.col > g2.col))
                    edgeHandleMap.set(eid1, { sourceHandle: 'bottom', targetHandle: 'bottom' });
                else if ((sg.col < g2.col && g2.col < g1.col) || (sg.col > g2.col && g2.col > g1.col))
                    edgeHandleMap.set(eid2, { sourceHandle: 'bottom', targetHandle: 'bottom' });
            }
            // Same col → vertical containment
            if (sg.col === g1.col && sg.col === g2.col) {
                if ((sg.row < g1.row && g1.row < g2.row) || (sg.row > g1.row && g1.row > g2.row))
                    edgeHandleMap.set(eid1, { sourceHandle: 'right', targetHandle: 'right' });
                else if ((sg.row < g2.row && g2.row < g1.row) || (sg.row > g2.row && g2.row > g1.row))
                    edgeHandleMap.set(eid2, { sourceHandle: 'right', targetHandle: 'right' });
            }
        };

        const bySrc = new Map<string, Array<{ eid: string; lTgt: string }>>();
        const byTgt = new Map<string, Array<{ eid: string; lSrc: string }>>();
        for (const edge of edgesToUpdate) {
            const { lSrc, lTgt } = logicalEnds(edge);
            if (!bySrc.has(lSrc)) bySrc.set(lSrc, []);
            bySrc.get(lSrc)!.push({ eid: edge.id, lTgt });
            if (!byTgt.has(lTgt)) byTgt.set(lTgt, []);
            byTgt.get(lTgt)!.push({ eid: edge.id, lSrc });
        }
        for (const [src, targets] of bySrc)
            for (let i = 0; i < targets.length; i++)
                for (let j = i + 1; j < targets.length; j++)
                    fixContained(src, targets[i].eid, targets[i].lTgt, targets[j].eid, targets[j].lTgt);
        for (const [tgt, sources] of byTgt)
            for (let i = 0; i < sources.length; i++)
                for (let j = i + 1; j < sources.length; j++)
                    fixContained(tgt, sources[i].eid, sources[i].lSrc, sources[j].eid, sources[j].lSrc);

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

    return { handleOrganize };
}
