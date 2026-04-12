import { KTestService } from "../service/kTest.service";
import { useKTestStore } from "../store/useKTest.store";
import type { KSubmitAnswersRequest, KUpdateTestRequest, KUpdateQuestionsRequest } from "../types/kTest.type";

export const useKTestLoader = () => {
    const { setTests, setIsLoadingTests } = useKTestStore();

    const loadTests = async (knowledgeId: number, nodeId?: number) => {
        if (!nodeId) { setTests([]); return; }
        setIsLoadingTests(true);
        try {
            const tests = await KTestService._getTests(knowledgeId, nodeId);
            setTests(tests);
        } catch (e) {
            console.error("loadTests failed", e);
        } finally {
            setIsLoadingTests(false);
        }
    };

    /** Load test detail */
    const getTestDetail = async (knowledgeId: number, testId: number) => {
        const res = await KTestService._getTestDetail(knowledgeId, testId);
        if (res.success && res.object) return res.object;
        throw new Error(res.message ?? "Failed to load test");
    };

    const loadTestDetail = getTestDetail;

    const submitAnswers = async (
        knowledgeId: number,
        testId: number,
        request: KSubmitAnswersRequest
    ) => {
        const res = await KTestService._submitAnswers(knowledgeId, testId, request);
        if (res.success && res.object) return res.object;
        throw new Error(res.message ?? "Failed to submit answers");
    };

    const loadQuestionScores = async (knowledgeId: number): Promise<Record<number, number>> => {
        try {
            return await KTestService._getQuestionScores(knowledgeId);
        } catch {
            return {};
        }
    };

    const updateTest = async (knowledgeId: number, testId: number, request: KUpdateTestRequest, nodeId?: number) => {
        const res = await KTestService._updateTest(knowledgeId, testId, request);
        if (res.success) {
            await loadTests(knowledgeId, nodeId);
            return true;
        }
        throw new Error(res.message ?? "Failed to update test");
    };

    const updateQuestions = async (knowledgeId: number, testId: number, request: KUpdateQuestionsRequest) => {
        const res = await KTestService._updateQuestions(knowledgeId, testId, request);
        if (res.success) return true;
        throw new Error(res.message ?? "Failed to update questions");
    };

    const createEmptyTest = async (knowledgeId: number, title: string, nodeId?: number) => {
        const res = await KTestService._createEmptyTest(knowledgeId, title, nodeId);
        if (res.success && res.object) {
            await loadTests(knowledgeId, nodeId);
            return res.object;
        }
        throw new Error(res.message ?? "Failed to create test");
    };

    const reorderTests = async (knowledgeId: number, orderedTestIds: number[]) => {
        await KTestService._reorderTests(knowledgeId, orderedTestIds);
        // update local store order without a full reload
        setTests(prev => {
            const map = new Map(prev.map(t => [t.id, t]));
            return orderedTestIds.map((id, i) => ({ ...map.get(id)!, sortOrder: i })).filter(Boolean);
        });
    };

    return { loadTests, createEmptyTest, getTestDetail, loadTestDetail, submitAnswers, loadQuestionScores, updateTest, updateQuestions, reorderTests };
};
