/**
 * MultiProject Task Flow — types
 */

import type { Task } from "@/types/task/task.types";

/** Data carried by each React Flow node */
export interface TaskFlowNodeData extends Record<string, unknown> {
    task: Task;
    projectName: string;
}

export type ArrowDirection = "forward" | "backward" | "both";

/** Data carried by a custom (user-created) flow edge */
export interface FlowEdgeData extends Record<string, unknown> {
    edgeId: number;
    note: string | null;
    arrowDirection: ArrowDirection;
    /** Whether to show animated dots (set at render time based on source node status) */
    _animate?: boolean;
}
