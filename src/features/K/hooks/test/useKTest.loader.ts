import { KTestService } from "../../service/kTest.service";
import { useKTestStore } from "../../store/useKTest.store";
import type { KSubmitAnswersRequest, KUpdateQuestionsRequest } from "../../types/kTest.type";

export const useKTestLoader = () => {
    const { setQuestions, setIsLoadingQuestions } = useKTestStore();

    const loadQuestions = async (knowledgeId: number) => {
        setIsLoadingQuestions(true);
        try {
            const res = await KTestService._getQuestions(knowledgeId);
            if (res.success && res.object) setQuestions(res.object.questions);
        } catch (e) {
            console.error("loadQuestions failed", e);
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    const submitAnswers = async (knowledgeId: number, request: KSubmitAnswersRequest) => {
        const res = await KTestService._submitAnswers(knowledgeId, request);
        if (res.success && res.object) return res.object;
        throw new Error("Failed to submit answers");
    };

    const loadQuestionScores = async (knowledgeId: number): Promise<Record<number, number>> => {
        try {
            return await KTestService._getQuestionScores(knowledgeId);
        } catch {
            return {};
        }
    };

    const updateQuestions = async (knowledgeId: number, request: KUpdateQuestionsRequest) => {
        const res = await KTestService._updateQuestions(knowledgeId, request);
        if (res.success) return true;
        throw new Error("Failed to update questions");
    };

    const markQuestionDraft = async (knowledgeId: number, questionId: number) => {
        await KTestService._markQuestionDraft(knowledgeId, questionId);
    };

    return { loadQuestions, submitAnswers, loadQuestionScores, updateQuestions, markQuestionDraft };
};
