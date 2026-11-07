/**
 * MultiProject Task Flow — node arrangement (smart wand, snap, tidy)
 */

import type { Node } from "@xyflow/react";
import { graphlib, layout as dagreLayout } from "@dagrejs/dagre";
import type { Task } from "@/features/taskDetail";
import type { TaskFlowNodeData } from "../types/multiProjectTaskFlow.type";
import { NODE_WIDTH, NODE_HEIGHT, H_GAP, V_GAP } from "./multiProjectTaskFlow.utils";

// ── Smart Wand ────────────────────────────────────────────────────────────────

/** Status column order for orphan node grouping */
const STATUS_ORDER: string[] = [
    "open", "in_progress", "background_progress", "paused",
    "on_hold", "completed", "cancelled", "failed",
];

/** Estimate rendered height of a node based on its task content. */
export function estimateNodeHeight(task: Task): number {
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

    // Partition: connected vs orphan
    const connectedIds = new Set<string>();
    for (const e of edges) { connectedIds.add(e.source); connectedIds.add(e.target); }

    const connectedNodes = nodes.filter((n) => connectedIds.has(n.id));
    const orphanNodes    = nodes.filter((n) => !connectedIds.has(n.id));

    // Connected nodes are never touched — user positioned them intentionally.
    if (orphanNodes.length === 0) return nodes;

    // ── Group orphan nodes into status columns ─────────────────────────────
    // Place below the center of in-progress / background_progress nodes.
    // If none exist, fall back to the bottom of all connected nodes.
    const ACTIVE_STATUSES = new Set(["in_progress", "background_progress"]);
    const activeNodes = connectedNodes.filter((n) => ACTIVE_STATUSES.has((n.data as TaskFlowNodeData).task.status));
    const anchorNodes = activeNodes.length > 0 ? activeNodes : connectedNodes;

    let anchorBottom = 0;
    let anchorCenterX = 0;
    if (anchorNodes.length > 0) {
        let sumX = 0;
        for (const n of anchorNodes) {
            const h = estimateNodeHeight((n.data as TaskFlowNodeData).task);
            anchorBottom = Math.max(anchorBottom, n.position.y + h);
            sumX += n.position.x + NODE_WIDTH / 2;
        }
        anchorCenterX = sumX / anchorNodes.length;
    }

    const orphanStartY = anchorNodes.length > 0
        ? anchorBottom + V_GAP * 8
        : 0;

    // Group by status, sort within each group by createdAt
    const orphanByStatus = new Map<string, typeof orphanNodes>();
    for (const n of orphanNodes) {
        const status = (n.data as TaskFlowNodeData).task.status ?? "open";
        if (!orphanByStatus.has(status)) orphanByStatus.set(status, []);
        orphanByStatus.get(status)!.push(n);
    }
    for (const [, group] of orphanByStatus) {
        group.sort((a, b) => {
            const aDate = (a.data as TaskFlowNodeData).task.createdAt;
            const bDate = (b.data as TaskFlowNodeData).task.createdAt;
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1;
            if (!bDate) return -1;
            return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
    }

    // Layout: each status = one column, nodes stacked vertically
    // Count total columns first to center them under the anchor area
    const orphanInfo = new Map<string, { x: number; y: number }>();
    const activeGroups: (typeof orphanNodes)[] = [];
    for (const status of STATUS_ORDER) {
        const group = orphanByStatus.get(status);
        if (group?.length) activeGroups.push(group);
    }
    for (const [status, group] of orphanByStatus) {
        if (!STATUS_ORDER.includes(status) && group.length) activeGroups.push(group);
    }
    const totalColumnsWidth = activeGroups.length * (NODE_WIDTH + H_GAP) - H_GAP;
    let colX = anchorNodes.length > 0
        ? anchorCenterX - totalColumnsWidth / 2
        : 0;

    for (const group of activeGroups) {
        let rowY = orphanStartY;
        for (const n of group) {
            orphanInfo.set(n.id, { x: colX, y: rowY });
            rowY += estimateNodeHeight((n.data as TaskFlowNodeData).task) + V_GAP;
        }
        colX += NODE_WIDTH + H_GAP;
    }

    // Return: connected nodes unchanged, orphans repositioned
    return nodes.map((n) => {
        const oInfo = orphanInfo.get(n.id);
        return oInfo ? { ...n, position: oInfo } : n;
    });
}

const SNAP_THRESHOLD = 40; // px — snap when centers are within this distance

/**
 * Snap dragged nodes' centers to align with their connected neighbors' centers.
 * Only snaps the axis (X or Y) whose delta is smallest and within threshold.
 * Unconnected and non-dragged nodes are returned unchanged.
 *
 * @param nodes     current flow nodes
 * @param edges     edges to derive neighbor relationships
 * @param draggedIds IDs of nodes that were just dragged
 */
export function snapToNeighborCenter(
    nodes: Node<TaskFlowNodeData>[],
    edges: { source: string; target: string }[],
    draggedIds: Set<string>,
): Node<TaskFlowNodeData>[] {
    if (draggedIds.size === 0) return nodes;

    const posMap = new Map(nodes.map((n) => [n.id, n.position]));
    const heightMap = new Map(nodes.map((n) => [n.id, estimateNodeHeight((n.data as TaskFlowNodeData).task)]));

    // Center of a node
    const center = (id: string) => {
        const p = posMap.get(id);
        const h = heightMap.get(id) ?? NODE_HEIGHT;
        if (!p) return null;
        return { x: p.x + NODE_WIDTH / 2, y: p.y + h / 2 };
    };

    // Build adjacency: dragged node → neighbor IDs
    const neighbors = new Map<string, string[]>();
    for (const e of edges) {
        if (draggedIds.has(e.source) && !draggedIds.has(e.target)) {
            if (!neighbors.has(e.source)) neighbors.set(e.source, []);
            neighbors.get(e.source)!.push(e.target);
        }
        if (draggedIds.has(e.target) && !draggedIds.has(e.source)) {
            if (!neighbors.has(e.target)) neighbors.set(e.target, []);
            neighbors.get(e.target)!.push(e.source);
        }
    }

    const snappedPositions = new Map<string, { x: number; y: number }>();

    for (const draggedId of draggedIds) {
        const nbrs = neighbors.get(draggedId);
        if (!nbrs || nbrs.length === 0) continue;

        const dc = center(draggedId);
        if (!dc) continue;

        let bestDeltaX: number | null = null;   // best (smallest |ΔX|) neighbor snap
        let bestDeltaY: number | null = null;   // best (smallest |ΔY|) neighbor snap

        for (const nbrId of nbrs) {
            const nc = center(nbrId);
            if (!nc) continue;
            const dx = nc.x - dc.x;
            const dy = nc.y - dc.y;
            if (Math.abs(dx) < SNAP_THRESHOLD && (bestDeltaX === null || Math.abs(dx) < Math.abs(bestDeltaX))) {
                bestDeltaX = dx;
            }
            if (Math.abs(dy) < SNAP_THRESHOLD && (bestDeltaY === null || Math.abs(dy) < Math.abs(bestDeltaY))) {
                bestDeltaY = dy;
            }
        }

        const p = posMap.get(draggedId)!;
        const h = heightMap.get(draggedId) ?? NODE_HEIGHT;
        let { x, y } = p;

        // Snap center-X → move node left/right so its center aligns with neighbor
        if (bestDeltaX !== null) x = dc.x + bestDeltaX - NODE_WIDTH / 2;
        // Snap center-Y → move node up/down so its center aligns with neighbor
        if (bestDeltaY !== null) y = dc.y + bestDeltaY - h / 2;

        snappedPositions.set(draggedId, { x, y });
    }

    if (snappedPositions.size === 0) return nodes;
    return nodes.map((n) => {
        const p = snappedPositions.get(n.id);
        return p ? { ...n, position: p } : n;
    });
}

/**
 * Run Dagre layout on the selected subset of nodes.
 * - Builds a subgraph from selected nodes + edges connecting them.
 * - Lays out with Dagre (top-down tree, LR fallback for disconnected).
 * - Translates the result so the bounding-box centroid stays fixed.
 * - Unselected nodes are returned unchanged.
 */
export function tidySelection(
    nodes: Node<TaskFlowNodeData>[],
    edges: { source: string; target: string }[],
): Node<TaskFlowNodeData>[] {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length < 2) return nodes; // nothing meaningful to tidy

    const selectedIds = new Set(selected.map((n) => n.id));

    // Subgraph edges: only those connecting two selected nodes
    const subEdges = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target));

    // ── Bounding-box centroid of current selection (to restore after layout) ─
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of selected) {
        const h = estimateNodeHeight((n.data as TaskFlowNodeData).task);
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
        maxY = Math.max(maxY, n.position.y + h);
    }
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // ── Dagre graph setup ────────────────────────────────────────────────────
    const g = new graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
        rankdir: "TB",
        nodesep: H_GAP,
        ranksep: V_GAP,
        marginx: 0,
        marginy: 0,
    });

    for (const n of selected) {
        const h = estimateNodeHeight((n.data as TaskFlowNodeData).task);
        g.setNode(n.id, { width: NODE_WIDTH, height: h });
    }
    for (const e of subEdges) {
        g.setEdge(e.source, e.target);
    }

    dagreLayout(g);

    // ── Read Dagre results ───────────────────────────────────────────────────
    // Dagre positions are center-based; convert to top-left
    const dagrePositions = new Map<string, { x: number; y: number }>();
    for (const n of selected) {
        const node = g.node(n.id);
        if (node) {
            dagrePositions.set(n.id, {
                x: node.x - NODE_WIDTH / 2,
                y: node.y - node.height / 2,
            });
        }
    }

    // ── Compute Dagre bounding-box centroid ──────────────────────────────────
    let dMinX = Infinity, dMinY = Infinity, dMaxX = -Infinity, dMaxY = -Infinity;
    for (const n of selected) {
        const pos = dagrePositions.get(n.id);
        if (!pos) continue;
        const h = estimateNodeHeight((n.data as TaskFlowNodeData).task);
        dMinX = Math.min(dMinX, pos.x);
        dMinY = Math.min(dMinY, pos.y);
        dMaxX = Math.max(dMaxX, pos.x + NODE_WIDTH);
        dMaxY = Math.max(dMaxY, pos.y + h);
    }
    const dCenterX = (dMinX + dMaxX) / 2;
    const dCenterY = (dMinY + dMaxY) / 2;

    // ── Translate Dagre positions so centroid matches original centroid ───────
    const offsetX = centerX - dCenterX;
    const offsetY = centerY - dCenterY;

    const newPositions = new Map<string, { x: number; y: number }>();
    for (const [id, pos] of dagrePositions) {
        newPositions.set(id, { x: pos.x + offsetX, y: pos.y + offsetY });
    }

    return nodes.map((n) => {
        const p = newPositions.get(n.id);
        return p ? { ...n, position: p } : n;
    });
}
