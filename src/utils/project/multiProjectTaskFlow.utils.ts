/**
 * MultiProject Task Flow — utility functions
 * Pure tree-layout algorithm: no external deps required.
 */

import type { Node, Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { Task } from "@/types/task/task.types";
import type { TaskFlowNodeData } from "@/types/multiProject/multiProjectTaskFlow.type";
import { constants } from "@/utils/constants";

const NODE_WIDTH = 230;
const NODE_HEIGHT = 76;
const H_GAP = 60;
const V_GAP = 90;
const PROJECT_GROUP_GAP = 120;

// ── Tree layout helpers ───────────────────────────────────────────────────────

function getSubtreeWidth(id: number, childrenMap: Map<number, number[]>): number {
    const children = childrenMap.get(id) ?? [];
    if (children.length === 0) return NODE_WIDTH;
    const total = children.reduce(
        (sum, c) => sum + getSubtreeWidth(c, childrenMap) + H_GAP,
        -H_GAP,
    );
    return Math.max(NODE_WIDTH, total);
}

function assignPositions(
    id: number,
    x: number,
    y: number,
    childrenMap: Map<number, number[]>,
    positions: Map<number, { x: number; y: number }>,
) {
    positions.set(id, { x, y });
    const children = childrenMap.get(id) ?? [];
    if (children.length === 0) return;

    const totalWidth = children.reduce(
        (sum, c) => sum + getSubtreeWidth(c, childrenMap) + H_GAP,
        -H_GAP,
    );
    let cx = x + (NODE_WIDTH - totalWidth) / 2;

    for (const childId of children) {
        const cw = getSubtreeWidth(childId, childrenMap);
        assignPositions(childId, cx, y + NODE_HEIGHT + V_GAP, childrenMap, positions);
        cx += cw + H_GAP;
    }
}

// ── Status/priority color helpers ────────────────────────────────────────────

export function getStatusBorderColor(status: string): string {
    const colors = constants.optionColor.taskStatus.colors[status];
    return (colors ?? constants.optionColor.taskStatus.default).bg;
}

/** Very muted background for node body based on status */
export function getStatusNodeBackground(status: string): string {
    const map: Record<string, string> = {
        open:                "rgba(31, 111, 67, 0.10)",
        in_progress:         "rgba(252, 204, 62, 0.12)",
        background_progress: "rgba(37, 31, 12, 0.14)",
        paused:              "rgba(87, 87, 87, 0.09)",
        completed:           "rgba(111, 66, 193, 0.10)",
        on_hold:             "rgba(71, 83, 99, 0.09)",
        cancelled:           "rgba(166, 54, 54, 0.09)",
    };
    return map[status] ?? "rgba(75, 85, 99, 0.08)";
}

export function getPriorityStyle(priority: string): { bg: string; text: string } {
    return constants.optionColor.taskPriority.colors[priority] ?? constants.optionColor.taskPriority.default;
}

// ── Main layout builder ───────────────────────────────────────────────────────

/**
 * Build React Flow nodes + edges from a flat task list.
 * Tasks are grouped by project, each group laid out as a tree.
 * Pass `savedPositions` to preserve user-dragged positions.
 */
export function buildTaskFlowLayout(
    tasks: Task[],
    projectNameMap: Map<number, string>,
    savedPositions?: Record<string, { x: number; y: number }>,
): { nodes: Node<TaskFlowNodeData>[]; edges: Edge[] } {
    if (tasks.length === 0) return { nodes: [], edges: [] };

    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const childrenMap = new Map<number, number[]>();
    const rootsByProject = new Map<number, number[]>();

    for (const t of tasks) {
        if (t.parentTaskId && taskMap.has(t.parentTaskId)) {
            if (!childrenMap.has(t.parentTaskId)) childrenMap.set(t.parentTaskId, []);
            childrenMap.get(t.parentTaskId)!.push(t.id);
        } else {
            if (!rootsByProject.has(t.projectId)) rootsByProject.set(t.projectId, []);
            rootsByProject.get(t.projectId)!.push(t.id);
        }
    }

    const autoPositions = new Map<number, { x: number; y: number }>();
    let rx = 0;

    for (const [, rootIds] of rootsByProject) {
        for (const rootId of rootIds) {
            const w = getSubtreeWidth(rootId, childrenMap);
            assignPositions(rootId, rx, 0, childrenMap, autoPositions);
            rx += w + H_GAP * 2;
        }
        rx += PROJECT_GROUP_GAP;
    }

    const nodes: Node<TaskFlowNodeData>[] = tasks.map((task) => {
        const auto = autoPositions.get(task.id) ?? { x: 0, y: 0 };
        const saved = savedPositions?.[String(task.id)];
        return {
            id: String(task.id),
            type: "taskFlowNode",
            position: saved ?? auto,
            data: {
                task,
                projectName: projectNameMap.get(task.projectId) ?? "Unknown",
            },
        };
    });

    const edges: Edge[] = tasks
        .filter((t) => t.parentTaskId && taskMap.has(t.parentTaskId))
        .map((t) => ({
            id: `e-${t.parentTaskId}-${t.id}`,
            source: String(t.parentTaskId),
            target: String(t.id),
            type: "smoothstep",
            style: { stroke: "#6b7280", strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6b7280", width: 16, height: 16 },
        }));

    return { nodes, edges };
}

// ── Smart Wand ────────────────────────────────────────────────────────────────

/** Status column order for orphan node grouping */
const STATUS_ORDER: string[] = [
    "open", "in_progress", "background_progress", "paused",
    "on_hold", "completed", "cancelled",
];

/** Estimate rendered height of a node based on its task content. */
function estimateNodeHeight(task: Task): number {
    const PADDING = 24; // py-3 × 2
    const LINE_H = 20;  // text-sm leading-snug ≈ 20px per line
    const CHARS_PER_LINE = 25; // ~176px content width / ~7px per char
    const titleLen = task.title?.length ?? 5;
    const titleLines = Math.min(3, Math.max(1, Math.ceil(titleLen / CHARS_PER_LINE)));
    const hasProgress = !!task.processJson && task.processJson !== "null";
    return PADDING + titleLines * LINE_H + (hasProgress ? 22 : 0); // 22 = 6px gap + 16px bar row
}

/**
 * Gently adjust existing node positions:
 * - Connected nodes: straighten edges (center-Y alignment + X nudge). Max `MAX_SHIFT` px.
 * - Orphan nodes (no edges): group into status columns below the connected region.
 */
export function smartWand(
    nodes: Node<TaskFlowNodeData>[],
    edges: { source: string; target: string }[],
): Node<TaskFlowNodeData>[] {
    if (nodes.length === 0) return nodes;

    const MAX_SHIFT = 40;
    const ROW_SNAP = NODE_HEIGHT + V_GAP;

    // Partition: connected vs orphan
    const connectedIds = new Set<string>();
    for (const e of edges) { connectedIds.add(e.source); connectedIds.add(e.target); }

    const connectedNodes = nodes.filter((n) => connectedIds.has(n.id));
    const orphanNodes = nodes.filter((n) => !connectedIds.has(n.id));

    // ── Part A: adjust connected nodes ──────────────────────────────────────
    const nodeInfo = new Map(connectedNodes.map((n) => {
        const h = estimateNodeHeight((n.data as TaskFlowNodeData).task);
        return [n.id, { x: n.position.x, y: n.position.y, h }];
    }));

    // Step 1: snap center-Y within rows
    const rowBuckets = new Map<number, string[]>();
    for (const n of connectedNodes) {
        const info = nodeInfo.get(n.id)!;
        const centerY = info.y + info.h / 2;
        const rowKey = Math.round(centerY / ROW_SNAP);
        if (!rowBuckets.has(rowKey)) rowBuckets.set(rowKey, []);
        rowBuckets.get(rowKey)!.push(n.id);
    }
    for (const [, ids] of rowBuckets) {
        if (ids.length < 2) continue;
        const centers = ids.map((id) => {
            const info = nodeInfo.get(id)!;
            return info.y + info.h / 2;
        }).sort((a, b) => a - b);
        const medianCenter = centers[Math.floor(centers.length / 2)];
        for (const id of ids) {
            const info = nodeInfo.get(id)!;
            const dy = medianCenter - (info.y + info.h / 2);
            info.y += Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, dy));
        }
    }

    // Step 2: nudge child X toward parent center
    const CENTER_THRESHOLD = NODE_WIDTH;
    for (const e of edges) {
        const pInfo = nodeInfo.get(e.source);
        const cInfo = nodeInfo.get(e.target);
        if (!pInfo || !cInfo) continue;
        if (cInfo.y <= pInfo.y) continue;
        const dx = (pInfo.x + NODE_WIDTH / 2) - (cInfo.x + NODE_WIDTH / 2);
        if (Math.abs(dx) <= CENTER_THRESHOLD) {
            cInfo.x += Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, dx));
        }
    }

    // ── Part B: group orphan nodes into status columns ──────────────────────
    // Find bottom of connected region to place orphans below
    let maxConnectedBottom = 0;
    for (const [, info] of nodeInfo) {
        maxConnectedBottom = Math.max(maxConnectedBottom, info.y + info.h);
    }
    const orphanStartY = connectedNodes.length > 0
        ? maxConnectedBottom + V_GAP * 2
        : 0;

    // Group orphans by status, maintaining STATUS_ORDER
    const orphanByStatus = new Map<string, typeof orphanNodes>();
    for (const n of orphanNodes) {
        const status = (n.data as TaskFlowNodeData).task.status ?? "open";
        if (!orphanByStatus.has(status)) orphanByStatus.set(status, []);
        orphanByStatus.get(status)!.push(n);
    }

    // Layout: each status is a column, nodes stacked vertically
    const orphanInfo = new Map<string, { x: number; y: number }>();
    let colX = 0;

    for (const status of STATUS_ORDER) {
        const group = orphanByStatus.get(status);
        if (!group || group.length === 0) continue;

        let rowY = orphanStartY;
        for (const n of group) {
            orphanInfo.set(n.id, { x: colX, y: rowY });
            const h = estimateNodeHeight((n.data as TaskFlowNodeData).task);
            rowY += h + V_GAP;
        }
        colX += NODE_WIDTH + H_GAP;
    }
    // Handle statuses not in STATUS_ORDER
    for (const [status, group] of orphanByStatus) {
        if (STATUS_ORDER.includes(status)) continue;
        let rowY = orphanStartY;
        for (const n of group) {
            orphanInfo.set(n.id, { x: colX, y: rowY });
            const h = estimateNodeHeight((n.data as TaskFlowNodeData).task);
            rowY += h + V_GAP;
        }
        colX += NODE_WIDTH + H_GAP;
    }

    // ── Merge results ───────────────────────────────────────────────────────
    return nodes.map((n) => {
        const cInfo = nodeInfo.get(n.id);
        if (cInfo) return { ...n, position: { x: cInfo.x, y: cInfo.y } };
        const oInfo = orphanInfo.get(n.id);
        if (oInfo) return { ...n, position: oInfo };
        return n;
    });
}
