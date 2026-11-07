/**
 * MultiProject Task Flow — utility functions
 * Pure tree-layout algorithm: no external deps required.
 */

import type { Node, Edge } from "@xyflow/react";
import { projectConstants } from "@/features/project/project.constants";
import type { Task } from "@/features/taskDetail";
import type { TaskFlowNodeData } from "../types/multiProjectTaskFlow.type";
import { constants } from "@/shared";

export const NODE_WIDTH = 230;
export const NODE_HEIGHT = 76;
export const H_GAP = 60;
export const V_GAP = 90;
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
    const colors = projectConstants.optionColor.taskStatus.colors[status];
    return (colors ?? projectConstants.optionColor.taskStatus.default).bg;
}

/** Very muted background for node body based on status — ~10% tint of the shared status colour (#1514) */
export function getStatusNodeBackground(status: string): string {
    return `${getStatusBorderColor(status)}1a`;
}

export function getPriorityStyle(priority: string): { bg: string; text: string } {
    return projectConstants.optionColor.taskPriority.colors[priority] ?? projectConstants.optionColor.taskPriority.default;
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

    return { nodes, edges: [] };
}
