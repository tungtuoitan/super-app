// ── Test summary (list view) ──────────────────────────────────────────────────

export interface KTestSummary {
    id: number;
    knowledgeId: number;
    userId: number;
    title: string;
    level: number;
    mode: string;
    nodeCount: number;
    /** Number of nodes with isActive = true */
    activeCount: number;
    /** Latest submission score (null if never submitted) */
    lastTotalPoints: number | null;
    lastMaxPoints: number | null;
    lastPct: number | null;
    lastSubmittedAt: string | null;
    createdAt: string | null;
    /** Last ≤10 submission percentages oldest→newest — for sparkline */
    scoreHistory: number[];
}

// ── Test detail (session view) ────────────────────────────────────────────────

export interface KTestDetail {
    id: number;
    knowledgeId: number;
    title: string;
    level: number;
    mode: string;
    /** Question nodes pulled from k.node */
    questions: KTestQuestion[];
    createdAt: string | null;
}

/** A single question in the test — sourced from a question node */
export interface KTestQuestion {
    /** k.test_node.id */
    testNodeId: number;
    /** k.node.id */
    nodeId: number;
    /** k.node.name — used as the question text */
    question: string;
    /** k.node.description — expected answer */
    answer: string | null;
    /** Whether this question is active in the test */
    isActive: boolean;
    /** Last ≤10 individual points (0–5) oldest→newest */
    scoreHistory: number[];
}

// ── Update test request ───────────────────────────────────────────────────────

export interface KUpdateTestRequest {
    title: string;
}

export interface KUpdateTestNodesRequest {
    /** k.node IDs to add as new questions */
    addNodeIds: number[];
    /** k.test_node IDs to toggle isActive */
    toggleTestNodeIds: number[];
    /** k.test_node IDs to permanently delete from this test */
    deleteTestNodeIds: number[];
}

// ── Create test request ───────────────────────────────────────────────────────

export interface KCreateTestFromNodesRequest {
    title: string;
    level: 1 | 2 | 3;
    /** Entity node IDs to pull question nodes from */
    nodeIds: number[];
    includeDescendants: boolean;
    count: number;
}

// ── Submit answers + grading result ──────────────────────────────────────────

export interface KAnswerItem {
    nodeId: number;
    /** null = skipped */
    answerText: string | null;
}

export interface KSubmitAnswersRequest {
    answers: KAnswerItem[];
}

export interface KSubmitAnswersResult {
    totalPoints: number;
    maxPoints: number;
    pct: number;
    grades: KNodeGrade[];
}

export interface KNodeGrade {
    nodeId: number;
    question: string;
    answerText: string | null;
    expectedAnswer: string | null;
    point: number;
    comment: string | null;
}

// ── Node scores (progress tracking) ──────────────────────────────────────────

export type KNodeScoreMap = Record<number, number>;
