import { flowService } from "@/shared";
import type { FlowEdgeDTO } from "@/shared";
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
 * Topological sort (DFS) of questions by their canvas flow edges.
 * Respects arrowDirection: forward = source→target, backward = target→source,
 * both = source→target (one direction chosen to avoid artificial cycles).
 * Unconnected questions and cycle members keep their original order at the end.
 */
export function topoSortByFlow<T extends { id: number }>(questions: T[], edges: FlowEdgeDTO[]): T[] {
    const idSet = new Set(questions.map((q) => q.id));
    const relevant = edges.filter(
        (e) =>
            e.sourceType === "kQuestion" &&
            e.targetType === "kQuestion" &&
            !e.deletedAt &&
            idSet.has(e.sourceId) &&
            idSet.has(e.targetId),
    );

    if (relevant.length === 0) return questions;

    // Build adjacency list respecting arrowDirection
    const adj = new Map<number, number[]>();
    for (const q of questions) adj.set(q.id, []);
    for (const e of relevant) {
        if (e.arrowDirection === "backward") {
            adj.get(e.targetId)?.push(e.sourceId);
        } else {
            // forward or both → source→target
            adj.get(e.sourceId)?.push(e.targetId);
        }
    }

    const visited = new Set<number>();
    const inStack = new Set<number>();
    const stack: number[] = [];

    const dfs = (id: number) => {
        if (visited.has(id) || inStack.has(id)) return;
        inStack.add(id);
        for (const nextId of (adj.get(id) ?? [])) dfs(nextId);
        inStack.delete(id);
        visited.add(id);
        stack.push(id);
    };

    for (const q of questions) dfs(q.id);

    // stack is reverse topo order
    const byId = new Map(questions.map((q) => [q.id, q]));
    const sorted: T[] = [];
    const sortedIds = new Set<number>();
    for (let i = stack.length - 1; i >= 0; i--) {
        const q = byId.get(stack[i]);
        if (q) { sorted.push(q); sortedIds.add(stack[i]); }
    }

    // append disconnected / cycle members in original order
    for (const q of questions) { if (!sortedIds.has(q.id)) sorted.push(q); }

    return sorted;
}

/** Fetch edges and return topologically sorted questions for a given test. */
export async function sortQuestionsByFlowOrder<T extends { id: number }>(
    questions: T[],
): Promise<T[]> {
    try {
        const res = await flowService._getEdges("");
        const edges: FlowEdgeDTO[] = (res.data as FlowEdgeDTO[]) ?? [];
        return topoSortByFlow(questions, edges);
    } catch {
        return questions;
    }
}
