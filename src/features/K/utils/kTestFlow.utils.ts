import { flowService } from "@/shared";
import type { FlowEdgeDTO } from "@/shared";
import { QUESTION_NODE_WIDTH, NODE_HEIGHT, COL_COUNT, H_GAP, V_GAP } from "./kTestFlow.constants";

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
 * Questions with no incoming edges come first; unconnected questions
 * keep their original order appended at the end.
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

    // adjacency list: sourceId → [targetId, ...]
    const adj = new Map<number, number[]>();
    const inDegree = new Map<number, number>();
    for (const q of questions) { adj.set(q.id, []); inDegree.set(q.id, 0); }
    for (const e of relevant) {
        adj.get(e.sourceId)!.push(e.targetId);
        inDegree.set(e.targetId, (inDegree.get(e.targetId) ?? 0) + 1);
    }

    const queue = questions.filter((q) => inDegree.get(q.id) === 0).map((q) => q.id);
    const sorted: T[] = [];
    const byId = new Map(questions.map((q) => [q.id, q]));

    while (queue.length > 0) {
        const id = queue.shift()!;
        const q = byId.get(id);
        if (q) sorted.push(q);
        for (const nextId of (adj.get(id) ?? [])) {
            const deg = (inDegree.get(nextId) ?? 1) - 1;
            inDegree.set(nextId, deg);
            if (deg === 0) queue.push(nextId);
        }
    }

    // append any remaining questions (cycles or disconnected) in original order
    const sortedIds = new Set(sorted.map((q) => q.id));
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
