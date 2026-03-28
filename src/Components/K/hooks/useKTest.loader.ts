import { KTestService } from "../service/kTest.service";
import { useKTestStore } from "../store/useKTest.store";
import type { KCreateTestFromNodesRequest, KSubmitAnswersRequest, KUpdateTestRequest, KUpdateTestNodesRequest } from "../types/kTest.type";

export const useKTestLoader = () => {
    const { setTests, setIsLoadingTests } = useKTestStore();

    const loadTests = async (knowledgeId: number) => {
        setIsLoadingTests(true);
        try {
            const tests = await KTestService._getTests(knowledgeId);
            setTests(tests);
        } catch (e) {
            console.error("loadTests failed", e);
        } finally {
            setIsLoadingTests(false);
        }
    };

    const createTestFromNodes = async (
        knowledgeId: number,
        request: KCreateTestFromNodesRequest
    ) => {
        const res = await KTestService._createTestFromNodes(knowledgeId, request);
        if (res.success && res.object) {
            await loadTests(knowledgeId);
            return res.object;
        }
        throw new Error(res.message ?? "Failed to create test");
    };

    /** Load test detail — alias: loadTestDetail */
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

    const loadNodeScores = async (knowledgeId: number): Promise<Record<number, number>> => {
        try {
            return await KTestService._getNodeScores(knowledgeId);
        } catch {
            return {};
        }
    };

    const updateTest = async (knowledgeId: number, testId: number, request: KUpdateTestRequest) => {
        const res = await KTestService._updateTest(knowledgeId, testId, request);
        if (res.success) {
            await loadTests(knowledgeId);
            return true;
        }
        throw new Error(res.message ?? "Failed to update test");
    };

    const updateTestNodes = async (knowledgeId: number, testId: number, request: KUpdateTestNodesRequest) => {
        const res = await KTestService._updateTestNodes(knowledgeId, testId, request);
        if (res.success) return true;
        throw new Error(res.message ?? "Failed to update test nodes");
    };

    return { loadTests, createTestFromNodes, getTestDetail, loadTestDetail, submitAnswers, loadNodeScores, updateTest, updateTestNodes };
};

