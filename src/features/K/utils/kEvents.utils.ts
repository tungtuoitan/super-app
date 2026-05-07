/**
 * K Feature — Custom DOM Event definitions
 *
 * Single source of truth for all custom DOM events dispatched/consumed within
 * (and across component boundaries of) the K feature.
 *
 * Pattern:
 *   1. `kEvents`       — string constants (prevent typos, enable rename refactors)
 *   2. Payload types   — typed `CustomEvent<T>` detail shapes
 *   3. WindowEventMap  — augmentation so TypeScript enforces types at every call site
 *   4. Dispatch helpers — typed wrappers so dispatch sites never construct raw CustomEvent
 */

// ── 1. Event name constants ────────────────────────────────────────────────

export const kEvents = {
    /** Dispatched from KNodePanel menus to trigger inline node creation */
    nodeInlineCreate: "k-node-inline-create",
    /** Dispatched when a quiz is drag-dropped to a different K tree node */
    quizMoved: "k-quiz-moved",
    /** Dispatched after a question is added / updated / deleted / restored in a test flow */
    flowQuestionsChanged: "kflow:questions-changed",
} as const;

// ── 2. Payload types ───────────────────────────────────────────────────────

export interface KNodeInlineCreateDetail {
    knowledgeId: number;
    parentId: number | null;
}

export interface KQuizMovedDetail {
    sourceNodeId: number;
    knowledgeId: number;
}

export interface KFlowQuestionsChangedDetail {
    nodeId: number | null; // null = orphan view
}

// ── 3. WindowEventMap augmentation ────────────────────────────────────────

declare global {
    interface WindowEventMap {
        "k-node-inline-create":    CustomEvent<KNodeInlineCreateDetail>;
        "k-quiz-moved":            CustomEvent<KQuizMovedDetail>;
        "kflow:questions-changed": CustomEvent<KFlowQuestionsChangedDetail>;
    }
}

// ── 4. Typed dispatch helpers ──────────────────────────────────────────────

export const dispatchKNodeInlineCreate = (detail: KNodeInlineCreateDetail) => {
    window.dispatchEvent(new CustomEvent(kEvents.nodeInlineCreate, { detail }));
};

export const dispatchKQuizMoved = (detail: KQuizMovedDetail) => {
    window.dispatchEvent(new CustomEvent(kEvents.quizMoved, { detail }));
};

export const dispatchKFlowQuestionsChanged = (detail: KFlowQuestionsChangedDetail) => {
    window.dispatchEvent(new CustomEvent(kEvents.flowQuestionsChanged, { detail }));
};
