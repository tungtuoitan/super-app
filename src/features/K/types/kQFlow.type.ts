import type { KTestQuestion } from "./kTest.type";

export type ArrowDirection = "forward" | "backward" | "both";

export interface KQFlowNodeData extends Record<string, unknown> {
    question: KTestQuestion;
}

export interface KFlowEdgeData extends Record<string, unknown> {
    edgeId: number;
    note: string | null;
    arrowDirection: ArrowDirection;
}
