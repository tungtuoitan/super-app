import { flowService } from "@/shared";
import type { FlowEdgeDTO, FlowNodePositionDTO } from "@/shared";
import { QUESTION_NODE_WIDTH, NODE_HEIGHT, COL_COUNT, H_GAP, V_GAP } from "./kQFlow.constants";

// Constants used by the overlap check (node visual bounds with margin)
const OVERLAP_NODE_W = 280, OVERLAP_NODE_H = 160, OVERLAP_GAP = 40;

/** Check whether any "moved" node position overlaps with any "target" node position. */
export function hasPositionOverlap(
    moved: { x: number; y: number }[],
    target: { x: number; y: number }[],
): boolean {
    for (const m of moved)
        for (const t of target)
            if (Math.abs(m.x - t.x) < OVERLAP_NODE_W + OVERLAP_GAP && Math.abs(m.y - t.y) < OVERLAP_NODE_H + OVERLAP_GAP)
                return true;
    return false;
}

/** Fallback grid layout for nodes that have no saved position yet. */
export function buildGridPosition(index: number): { x: number; y: number } {
    const col = index % COL_COUNT;
    const row = Math.floor(index / COL_COUNT);
    return {
        x: col * (QUESTION_NODE_WIDTH + H_GAP),
        y: row * (NODE_HEIGHT + V_GAP),
    };
}

/**
 * Topological sort (Kahn's BFS) of questions by their canvas flow edges.
 * When multiple nodes are available at the same time, tie-breaks by canvas
 * position (y first, then x) so grid rows are processed left-to-right, top-to-bottom.
 * Respects arrowDirection: backward reverses the edge direction.
 * Unconnected questions and cycle members keep their original order at the end.
 */
export function topoSortByFlow<T extends { id: number }>(
    questions: T[],
    edges: FlowEdgeDTO[],
    positions?: FlowNodePositionDTO[],
): T[] {
    const idSet = new Set(questions.map((q) => q.id));
    const relevant = edges.filter(
        (e) =>
            e.sourceType === "kQuestion" &&
            e.targetType === "kQuestion" &&
            !e.deletedAt &&
            idSet.has(e.sourceId) &&
            idSet.has(e.targetId),
    );

    // Position map: prefer top rows (low y), then left columns (low x)
    const posMap = new Map<number, { x: number; y: number }>();
    if (positions) {
        for (const p of positions) posMap.set(p.nodeId, { x: p.x, y: p.y });
    }
    const origIndex = new Map<number, number>(questions.map((q, i) => [q.id, i]));
    const comparePos = (a: number, b: number): number => {
        const pa = posMap.get(a);
        const pb = posMap.get(b);
        if (pa && pb) {
            if (pa.y !== pb.y) return pa.y - pb.y;
            if (pa.x !== pb.x) return pa.x - pb.x;
        }
        return (origIndex.get(a) ?? 0) - (origIndex.get(b) ?? 0);
    };

    // No edges — sort purely by canvas position (row by row: top→bottom, left→right)
    if (relevant.length === 0) {
        return [...questions].sort((a, b) => comparePos(a.id, b.id));
    }

    // Build adjacency list and in-degree (Kahn's algorithm)
    const adj = new Map<number, number[]>();
    const inDegree = new Map<number, number>();
    for (const q of questions) { adj.set(q.id, []); inDegree.set(q.id, 0); }
    for (const e of relevant) {
        const src = e.arrowDirection === "backward" ? e.targetId : e.sourceId;
        const tgt = e.arrowDirection === "backward" ? e.sourceId : e.targetId;
        adj.get(src)?.push(tgt);
        inDegree.set(tgt, (inDegree.get(tgt) ?? 0) + 1);
    }

    // Seed queue with in-degree-0 nodes sorted by position
    let queue = questions
        .filter((q) => (inDegree.get(q.id) ?? 0) === 0)
        .map((q) => q.id)
        .sort(comparePos);

    const byId = new Map(questions.map((q) => [q.id, q]));
    const sorted: T[] = [];
    const sortedIds = new Set<number>();

    while (queue.length > 0) {
        const id = queue.shift()!;
        const q = byId.get(id);
        if (q) { sorted.push(q); sortedIds.add(id); }

        const newlyReady: number[] = [];
        for (const nextId of (adj.get(id) ?? [])) {
            const deg = (inDegree.get(nextId) ?? 0) - 1;
            inDegree.set(nextId, deg);
            if (deg === 0) newlyReady.push(nextId);
        }
        if (newlyReady.length > 0) {
            queue = [...queue, ...newlyReady].sort(comparePos);
        }
    }

    // Append disconnected / cycle members in original order
    for (const q of questions) { if (!sortedIds.has(q.id)) sorted.push(q); }

    return sorted;
}

/** Fetch edges + positions and return topologically sorted questions. */
export async function sortQuestionsByFlowOrder<T extends { id: number }>(
    questions: T[],
): Promise<T[]> {
    try {
        const [edgeRes, posRes] = await Promise.all([
            flowService._getEdges(""),
            flowService._getPositions("", { nodeType: "kQuestion" }),
        ]);
        const edges: FlowEdgeDTO[] = (edgeRes.data as FlowEdgeDTO[]) ?? [];
        const positions: FlowNodePositionDTO[] = (posRes.data as FlowNodePositionDTO[]) ?? [];
        return topoSortByFlow(questions, edges, positions);
    } catch {
        return questions;
    }
}
