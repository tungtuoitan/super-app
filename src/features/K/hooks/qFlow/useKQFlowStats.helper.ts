import { useMemo } from "react";
import { parseAsLocalDate } from "@/shared";
import type { KQuestion } from "@/features/K/types/kTest.type";

const MASTER_STREAK  = 5;
const GOOD_SCORE_MIN = 4; // 0–5 scale; 4–5 = good recall

export function useKQFlowStats(questions: KQuestion[]) {
    const now             = new Date();
    const activeQuestions = questions.filter(q => !q.deletedAt);
    // Only "learning" questions are included in review sessions
    const reviewableQuestions = activeQuestions.filter(q => q.statusCode === "learning");

    const dueCount = reviewableQuestions.filter(q => {
        if (!q.srsNextReviewAt) return false;
        const d = parseAsLocalDate(q.srsNextReviewAt);
        return d !== null && d <= now;
    }).length;
    const newCount        = reviewableQuestions.filter(q => !q.srsNextReviewAt).length;
    const draftCount      = activeQuestions.filter(q => q.statusCode === "draft").length;
    const totalReviewable = dueCount + newCount;
    const canReview       = totalReviewable > 0;

    // "Master" is UI-only: statusCode stays "learning" but we surface a badge
    // when every reviewable (non-draft) question has MASTER_STREAK consecutive good scores.
    const isMaster = useMemo(() => {
        if (reviewableQuestions.length === 0) return false;
        return reviewableQuestions.every(q =>
            q.scoreHistory.length >= MASTER_STREAK &&
            q.scoreHistory.slice(-MASTER_STREAK).every(s => s >= GOOD_SCORE_MIN)
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reviewableQuestions]);

    // Aggregate sparkline: average score across all questions per slot (0–5 → ×20 → 0–100)
    const sparkScores = useMemo(() => {
        const qs = activeQuestions.filter(q => q.scoreHistory.length > 0);
        if (qs.length === 0) return [];
        const SLOTS = 7;
        const result: number[] = [];
        for (let slot = 0; slot < SLOTS; slot++) {
            const values: number[] = [];
            for (const q of qs) {
                const idx = q.scoreHistory.length - SLOTS + slot;
                if (idx >= 0) values.push(q.scoreHistory[idx]);
            }
            if (values.length > 0)
                result.push(Math.round(values.reduce((a, b) => a + b, 0) / values.length * 20));
        }
        return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questions]);

    return {
        activeQuestions, reviewableQuestions,
        dueCount, newCount, draftCount,
        totalReviewable, canReview,
        isMaster, sparkScores,
    };
}
