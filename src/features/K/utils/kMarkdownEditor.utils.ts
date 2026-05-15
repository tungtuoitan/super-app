import { flowService } from "@/shared";
import type { FlowEdgeDTO, FlowNodePositionDTO } from "@/shared";
import type { KQuestion } from "../types/kQuiz.type";
import { QUESTION_NODE_WIDTH, NODE_HEIGHT } from "./kQFlow.constants";

const GAP_X = 64;
const GAP_Y = 48;
const GROUP_GAP_Y = 400;
// Must be > NODE_HEIGHT + GAP_Y (208) to keep same-group rows together,
// and < GROUP_GAP_Y (400) to split different groups.
const CLUSTER_THRESHOLD = NODE_HEIGHT + GAP_Y + 50; // 258

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ParsedQuestion {
    id: number | null;
    question: string;
    answer: string;
}

export interface QuestionWithPos {
    question: KQuestion;
    x: number;
    y: number;
}

export interface EdgeLink {
    sourceId: number;
    targetId: number;
}

// ── Reading-order comparator (row-first, then left-to-right) ─────────────────

const ROW_TOLERANCE = 100; // px — items within this Y-distance are treated as the same row
const readingOrder = (a: QuestionWithPos, b: QuestionWithPos): number => {
    if (Math.abs(a.y - b.y) > ROW_TOLERANCE) return a.y - b.y;
    return a.x - b.x;
};

// ── Spatial clustering ─────────────────────────────────────────────────────────

export function clusterByPosition(items: QuestionWithPos[]): QuestionWithPos[][] {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
    const groups: QuestionWithPos[][] = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].y - sorted[i - 1].y > CLUSTER_THRESHOLD) groups.push([sorted[i]]);
        else groups[groups.length - 1].push(sorted[i]);
    }
    return groups;
}

// ── Edge-chain ordering (Kahn's BFS topological sort) ─────────────────────────

export function orderGroupByEdges(items: QuestionWithPos[], edges: EdgeLink[]): QuestionWithPos[] {
    const ids = new Set(items.map(i => i.question.id));
    const relevant = edges.filter(e => ids.has(e.sourceId) && ids.has(e.targetId));
    if (relevant.length === 0) return [...items].sort(readingOrder);

    const outgoing = new Map<number, number[]>();
    const inDegree = new Map<number, number>();
    items.forEach(i => { outgoing.set(i.question.id, []); inDegree.set(i.question.id, 0); });
    for (const e of relevant) {
        outgoing.get(e.sourceId)?.push(e.targetId);
        inDegree.set(e.targetId, (inDegree.get(e.targetId) ?? 0) + 1);
    }

    const queue: QuestionWithPos[] = items
        .filter(i => (inDegree.get(i.question.id) ?? 0) === 0)
        .sort(readingOrder);
    const visited = new Set<number>();
    const result: QuestionWithPos[] = [];

    while (queue.length > 0) {
        const item = queue.shift()!;
        if (visited.has(item.question.id)) continue;
        visited.add(item.question.id);
        result.push(item);
        (outgoing.get(item.question.id) ?? [])
            .map(id => items.find(i => i.question.id === id))
            .filter((i): i is QuestionWithPos => !!i)
            .sort(readingOrder)
            .forEach(i => queue.push(i));
    }
    items.filter(i => !visited.has(i.question.id)).sort(readingOrder).forEach(i => result.push(i));
    return result;
}

// ── Markdown generation ────────────────────────────────────────────────────────

export function buildMarkdown(
    questions: KQuestion[],
    positions: Record<number, { x: number; y: number }>,
    edges: EdgeLink[],
): string {
    const active = questions.filter(q => !q.deletedAt);
    if (active.length === 0) return "# \n";

    const withPos: QuestionWithPos[] = active.map(q => ({
        question: q,
        x: positions[q.id]?.x ?? 0,
        y: positions[q.id]?.y ?? 0,
    }));

    const groups = clusterByPosition(withPos);
    const lines: string[] = [];

    for (let gi = 0; gi < groups.length; gi++) {
        if (gi > 0) { lines.push("", ""); }
        lines.push("# ");
        for (const item of orderGroupByEdges(groups[gi], edges)) {
            const q = item.question;
            lines.push("");
            lines.push(`## ${q.question} <!-- id:${q.id} -->`);
            if (q.answer?.trim()) lines.push(q.answer.trim());
        }
    }
    return lines.join("\n");
}

// ── Markdown parsers ───────────────────────────────────────────────────────────

export function parseMarkdown(md: string): ParsedQuestion[] {
    const result: ParsedQuestion[] = [];
    let cur: ParsedQuestion | null = null;

    const flush = () => {
        if (!cur) return;
        cur.answer = cur.answer.trim();
        if (cur.question.trim()) result.push(cur);
        cur = null;
    };

    for (const raw of md.split("\n")) {
        const line = raw.trimEnd();
        if (line.startsWith("## ")) {
            flush();
            const text = line.slice(3).trim();
            const idMatch = text.match(/<!--\s*id:(\d+)\s*-->/);
            cur = { id: idMatch ? parseInt(idMatch[1], 10) : null, question: text.replace(/<!--.*?-->/g, "").trim(), answer: "" };
            continue;
        }
        if (/^#(?!#)/.test(line)) { flush(); continue; }
        if (cur) cur.answer = cur.answer ? cur.answer + "\n" + line : line;
    }
    flush();
    return result;
}

/** Like parseMarkdown but preserves # section boundaries as groups. */
export function parseMarkdownGroups(md: string): ParsedQuestion[][] {
    const groups: ParsedQuestion[][] = [[]];
    let cur: ParsedQuestion | null = null;

    const flush = () => {
        if (!cur) return;
        cur.answer = cur.answer.trim();
        if (cur.question.trim()) groups[groups.length - 1].push(cur);
        cur = null;
    };

    for (const raw of md.split("\n")) {
        const line = raw.trimEnd();
        if (line.startsWith("## ")) {
            flush();
            const text = line.slice(3).trim();
            const idMatch = text.match(/<!--\s*id:(\d+)\s*-->/);
            cur = { id: idMatch ? parseInt(idMatch[1], 10) : null, question: text.replace(/<!--.*?-->/g, "").trim(), answer: "" };
            continue;
        }
        if (/^#(?!#)/.test(line)) {
            flush();
            if (groups[groups.length - 1].length > 0) groups.push([]);
            continue;
        }
        if (cur) cur.answer = cur.answer ? cur.answer + "\n" + line : line;
    }
    flush();
    return groups.filter(g => g.length > 0);
}

// ── Edge-aware ID ordering ─────────────────────────────────────────────────────

/**
 * DFS ordering so edge-connected nodes are placed adjacent in the grid.
 * Roots (in-degree 0) are visited in original order; each root's chain is
 * followed depth-first before moving to the next root.
 */
function orderIdsByEdges(ids: number[], edges: { sourceId: number; targetId: number }[]): number[] {
    if (edges.length === 0) return ids;

    const outgoing = new Map<number, number[]>();
    const inDegree = new Map<number, number>();
    ids.forEach(id => { outgoing.set(id, []); inDegree.set(id, 0); });
    for (const e of edges) {
        outgoing.get(e.sourceId)?.push(e.targetId);
        inDegree.set(e.targetId, (inDegree.get(e.targetId) ?? 0) + 1);
    }

    const origOrder = new Map(ids.map((id, i) => [id, i]));
    const roots = ids
        .filter(id => (inDegree.get(id) ?? 0) === 0)
        .sort((a, b) => (origOrder.get(a) ?? 0) - (origOrder.get(b) ?? 0));

    const visited = new Set<number>();
    const result: number[] = [];

    const visit = (id: number) => {
        if (visited.has(id)) return;
        visited.add(id);
        result.push(id);
        (outgoing.get(id) ?? [])
            .sort((a, b) => (origOrder.get(a) ?? 0) - (origOrder.get(b) ?? 0))
            .forEach(visit);
    };

    roots.forEach(visit);
    ids.filter(id => !visited.has(id)).forEach(id => result.push(id));
    return result;
}

// ── Reorganize layout after save ───────────────────────────────────────────────

/**
 * After saving, snaps each # group into a tidy grid and deletes cross-group edges.
 * fetchFreshActive re-fetches questions so newly created ones get their IDs.
 */
export async function reorganizeGroups(
    preActiveQs: KQuestion[],
    parsedGroups: ParsedQuestion[][],
    fetchFreshActive: () => Promise<KQuestion[]>,
): Promise<void> {
    if (parsedGroups.length === 0) return;

    const preExistingIds = new Set(preActiveQs.map(q => q.id));
    const freshActive = await fetchFreshActive();
    const newlyCreated = freshActive.filter(q => !preExistingIds.has(q.id));

    let newIdx = 0;
    const resolvedGroups: number[][] = parsedGroups
        .map(group => group.flatMap(pq => {
            if (pq.id !== null) return preExistingIds.has(pq.id) ? [pq.id] : [];
            const nq = newlyCreated[newIdx++];
            return nq ? [nq.id] : [];
        }))
        .filter(g => g.length > 0);

    if (resolvedGroups.length === 0) return;

    const allIds = resolvedGroups.flat();
    const [posRes, edgeRes] = await Promise.all([
        flowService._getPositions("", { nodeType: "kQuestion", nodeIds: allIds.join(",") }),
        flowService._getEdges(""),
    ]);

    const posMap = new Map<number, { x: number; y: number }>();
    for (const p of (posRes.data as FlowNodePositionDTO[]) ?? []) posMap.set(p.nodeId, { x: p.x, y: p.y });

    const allIdSet = new Set(allIds);
    const relevantEdges: FlowEdgeDTO[] = ((edgeRes.data as FlowEdgeDTO[]) ?? []).filter(e =>
        e.sourceType === "kQuestion" && e.targetType === "kQuestion" && !e.deletedAt &&
        allIdSet.has(e.sourceId) && allIdSet.has(e.targetId)
    );

    // Cross-group edges → soft-delete
    const qGroupIdx = new Map<number, number>();
    for (let gi = 0; gi < resolvedGroups.length; gi++)
        for (const id of resolvedGroups[gi]) qGroupIdx.set(id, gi);

    const crossEdges = relevantEdges.filter(e => qGroupIdx.get(e.sourceId) !== qGroupIdx.get(e.targetId));

    // Reorder IDs within each group so edge-connected nodes are adjacent
    const orderedGroups = resolvedGroups.map(group => {
        const idSet = new Set(group);
        const intraEdges = relevantEdges
            .filter(e => idSet.has(e.sourceId) && idSet.has(e.targetId))
            .map(e => ({ sourceId: e.sourceId, targetId: e.targetId }));
        return orderIdsByEdges(group, intraEdges);
    });

    // Compute grid positions per group
    const newPositions: { nodeId: number; nodeType: string; x: number; y: number }[] = [];
    let nextGroupY = 0;

    for (let gi = 0; gi < orderedGroups.length; gi++) {
        const group = orderedGroups[gi];
        const n = group.length;
        const cols = Math.min(n, 5);
        const rows = Math.ceil(n / cols);
        const existing = group.filter(id => posMap.has(id)).map(id => posMap.get(id)!);
        const gx = existing.length > 0 ? Math.min(...existing.map(p => p.x)) : 0;
        const gy = gi === 0
            ? (existing.length > 0 ? Math.min(...existing.map(p => p.y)) : 0)
            : nextGroupY;

        for (let i = 0; i < n; i++) {
            newPositions.push({
                nodeId: group[i],
                nodeType: "kQuestion",
                x: gx + (i % cols) * (QUESTION_NODE_WIDTH + GAP_X),
                y: gy + Math.floor(i / cols) * (NODE_HEIGHT + GAP_Y),
            });
        }
        nextGroupY = gy + rows * (NODE_HEIGHT + GAP_Y) + GROUP_GAP_Y;
    }

    await Promise.all([
        newPositions.length > 0 ? flowService._upsertPositions("", newPositions) : Promise.resolve(),
        crossEdges.length > 0
            ? flowService._upsertEdges("", crossEdges.map(e => ({
                id: e.id, sourceId: e.sourceId, targetId: e.targetId,
                deletedAt: new Date().toISOString(),
            })))
            : Promise.resolve(),
    ]);
}
