/**
 * MultiProject Task Flow — handle selection helpers
 */

import type { Node, Edge } from "@xyflow/react";
import type { TaskFlowNodeData } from "../types/multiProjectTaskFlow.type";
import { NODE_WIDTH, NODE_HEIGHT } from "./multiProjectTaskFlow.utils";

// ── Nearest handle pair ──────────────────────────────────────────────────────

/**
 * Given two nodes, compute the most natural source/target handle pair
 * based on the center-to-center direction.
 */
export function nearestHandlePair(
    srcCx: number, srcCy: number,
    tgtCx: number, tgtCy: number,
): { sourceHandle: string; targetHandle: string } {
    const dx = tgtCx - srcCx;
    const dy = tgtCy - srcCy;
    if (Math.abs(dx) >= Math.abs(dy)) {
        return dx >= 0
            ? { sourceHandle: "right", targetHandle: "left" }
            : { sourceHandle: "left",  targetHandle: "right" };
    } else {
        return dy >= 0
            ? { sourceHandle: "bottom", targetHandle: "top" }
            : { sourceHandle: "top",    targetHandle: "bottom" };
    }
}

type HandleId = "top" | "bottom" | "left" | "right";

interface HandlePoint { x: number; y: number; id: HandleId }

function getHandlePoints(pos: { x: number; y: number }): HandlePoint[] {
    return [
        { x: pos.x + NODE_WIDTH / 2, y: pos.y,              id: "top" },
        { x: pos.x + NODE_WIDTH / 2, y: pos.y + NODE_HEIGHT, id: "bottom" },
        { x: pos.x,                  y: pos.y + NODE_HEIGHT / 2, id: "left" },
        { x: pos.x + NODE_WIDTH,     y: pos.y + NODE_HEIGHT / 2, id: "right" },
    ];
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy; // squared is fine for comparison
}

/**
 * For each edge, pick the source/target handle pair that gives the shortest distance.
 * Returns a map: edgeId → { sourceHandle, targetHandle }.
 */
export function computeOptimalHandles(
    nodes: Node<TaskFlowNodeData>[],
    edges: Edge[],
): Map<string, { sourceHandle: HandleId; targetHandle: HandleId }> {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const result = new Map<string, { sourceHandle: HandleId; targetHandle: HandleId }>();

    for (const edge of edges) {
        const sNode = nodeMap.get(edge.source);
        const tNode = nodeMap.get(edge.target);
        if (!sNode || !tNode) continue;

        const sHandles = getHandlePoints(sNode.position);
        const tHandles = getHandlePoints(tNode.position);

        let bestDist = Infinity;
        let bestSrc: HandleId = "bottom";
        let bestTgt: HandleId = "top";

        for (const sh of sHandles) {
            for (const th of tHandles) {
                const d = dist(sh, th);
                if (d < bestDist) {
                    bestDist = d;
                    bestSrc = sh.id;
                    bestTgt = th.id;
                }
            }
        }

        result.set(edge.id, { sourceHandle: bestSrc, targetHandle: bestTgt });
    }

    return result;
}
