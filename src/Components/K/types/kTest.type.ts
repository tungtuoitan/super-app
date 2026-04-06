// ── Test summary (list view) ──────────────────────────────────────────────────

export interface KTestSummary {
    id: number;
    knowledgeId: number;
    userId: number;
    /** Entity node (k.node.id) this test is linked to */
    nodeId: number | null;
    title: string;
    level: number;
    mode: string;
    /** inactive | learning | mastered */
    status: string | null;
    /** Total question count */
    questionCount: number;
    /** Number of questions with isActive = true */
    activeCount: number;
    /** Latest submission score (null if never submitted) */
    lastTotalPoints: number | null;
    lastMaxPoints: number | null;
    lastPct: number | null;
    lastSubmittedAt: string | null;
    createdAt: string | null;
    sortOrder: number;
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
    /** Questions belonging to this test (from k.question table) */
    questions: KTestQuestion[];
    createdAt: string | null;
}

/** A single question in the test — stored in k.question table */
export interface KTestQuestion {
    /** k.question.id */
    id: number;
    /** k.question.name — the question text */
    question: string;
    /** k.question.description — expected answer */
    answer: string | null;
    /** Whether this question is active in the test */
    isActive: boolean;
    /** Display/sort order within the test */
    sortOrder: number;
    /** Last ≤10 individual points (0–5) oldest→newest */
    scoreHistory: number[];
    /** Non-null when question has been soft-deleted */
    deletedAt?: string | null;
}

// ── Update test request ───────────────────────────────────────────────────────

export interface KUpdateTestRequest {
    title: string;
    /** Optionally re-link test to a different entity node */
    nodeId?: number | null;
}

// ── Question management ──────────────────────────────────────────────────────

export interface KUpdateQuestionsRequest {
    /** New questions to add to the test */
    addQuestions: Array<{ name: string; description?: string | null }>;
    /** Existing questions to update name/description */
    updateQuestions: Array<{ id: number; name: string; description?: string | null }>;
    /** k.question IDs to toggle isActive */
    toggleQuestionIds: number[];
    /** k.question IDs to soft-delete */
    deleteQuestionIds: number[];
    /** k.question IDs to restore (clear deletedAt) */
    restoreQuestionIds: number[];
}

// ── Submit answers + grading result ──────────────────────────────────────────

export interface KAnswerItem {
    /** k.question.id */
    questionId: number;
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
    grades: KQuestionGrade[];
}

export interface KQuestionGrade {
    questionId: number;
    question: string;
    answerText: string | null;
    expectedAnswer: string | null;
    point: number;
    comment: string | null;
}

// ── Question scores (progress tracking) ─────────────────────────────────────

export type KQuestionScoreMap = Record<number, number>;

// ── Daily Review (SRS) ────────────────────────────────────────────────────

export interface KDailyQueueItem {
    testId: number;
    knowledgeId: number;
    knowledgeName: string;
    title: string;
    level: number;
    status: string | null;
    /** Questions due for review */
    dueCount: number;
    /** New questions (never reviewed) */
    newCount: number;
    /** Total active questions */
    activeCount: number;
}

export interface KDailySessionQuestion {
    id: number;
    question: string;
    answer: string | null;
}

export interface KDailyAnswerItem {
    questionId: number;
    answerText: string | null;
    responseTimeMs: number | null;
}

export interface KDailySubmitRequest {
    answers: KDailyAnswerItem[];
}
