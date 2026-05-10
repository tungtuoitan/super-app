// ── Questions list for a knowledge ───────────────────────────────────────────

export interface KQuestionsListResponse {
    knowledgeId: number;
    questions: KQuestion[];
}

/** A single question stored in k.question table */
export interface KQuestion {
    /** k.question.id */
    id: number;
    /** k.node.id — null if orphan */
    nodeId: number | null;
    /** k.node.name — empty string if orphan */
    nodeName: string;
    /** k.question.name — the question text */
    question: string;
    /** k.question.description — expected answer */
    answer: string | null;
    /** "learning" = active in review; "draft" = excluded from review sessions */
    statusCode: string;
    /** Display/sort order within the knowledge */
    sortOrder: number;
    /** Last ≤10 individual points (0–5) oldest→newest */
    scoreHistory: number[];
    /** SRS next review date (null = never reviewed) */
    srsNextReviewAt?: string | null;
    /** Current retention 0–100% (forgetting curve) */
    retention: number;
    /** Non-null when question has been soft-deleted */
    deletedAt?: string | null;
}

// ── Question management ──────────────────────────────────────────────────────

export interface KUpdateQuestionsRequest {
    /** New questions to add to the knowledge */
    addQuestions: Array<{ name: string; description?: string | null }>;
    /** Existing questions to update name/description */
    updateQuestions: Array<{ id: number; name: string; description?: string | null }>;
    /** k.question IDs to soft-delete */
    deleteQuestionIds: number[];
    /** k.question IDs to restore (clear deletedAt) */
    restoreQuestionIds: number[];
    /** k.question IDs to reset SRS state */
    resetSrsQuestionIds?: number[];
    /** k.question IDs to toggle isDraft flag */
    toggleDraftQuestionIds?: number[];
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

// ── Per-node SRS due summary ──────────────────────────────────────────────

/** Per-node due/new count — from GET /api/k/{knowledgeId}/node-due-summary */
export interface KNodeDueCount {
    nodeId: number;
    /** Questions with srsNextReviewAt <= now */
    dueCount: number;
    /** Questions with srsNextReviewAt = null (never reviewed) */
    newCount: number;
}

// ── Daily Review (SRS) ────────────────────────────────────────────────────

export interface KDailyQueueItem {
    knowledgeId: number;
    knowledgeName: string;
    /** Questions due for review */
    dueCount: number;
    /** New questions (never reviewed) */
    newCount: number;
    /** Total active questions */
    activeCount: number;
    /** Questions with statusCode = 'draft' */
    draftCount: number;
}

export interface KDailySessionQuestion {
    id: number;
    question: string;
    answer: string | null;
    /** Seconds from now until next review for each score 1–5 */
    previewIntervalSeconds: Record<number, number>;
}

export interface KDailyAnswerItem {
    questionId: number;
    answerText: string | null;
    responseTimeMs: number | null;
    selfScore: number | null;
}

export interface KDailySubmitRequest {
    answers: KDailyAnswerItem[];
}

// ── Retention ────────────────────────────────────────────────────────────────

export interface KRetentionSummary {
    average: number;
    totalQuestions: number;
}

// ── Retention Graph ──────────────────────────────────────────────────────

export interface KRetentionGraph {
    questions: KRetentionGraphQuestion[];
    days: KRetentionGraphDay[];
}

export interface KRetentionGraphQuestion {
    id: number;
    name: string;
}

export interface KRetentionGraphDay {
    date: string;
    average: number;
    retentions: number[];
}

// ── Question Status Timeline (Progress dashboard) ──────────────────────────

export interface KQuestionStatusTimelinePoint {
    /** "yyyy-MM-dd" */
    date: string;
    master: number;
    learning: number;
    draft: number;
    deleted: number;
}

export interface KQuestionStatusTimeline {
    days: KQuestionStatusTimelinePoint[];
    /** Direct COUNT(*) from k.question for today — compare with today's sum(4) to detect classification bugs. */
    dbTotalToday: number;
}
