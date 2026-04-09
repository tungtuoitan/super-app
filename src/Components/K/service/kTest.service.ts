import { config } from "@/config/app.config";
import { envConfig } from "@/config/env.config";
import { apiFetch } from "@/services/apiClient";
import type {
    KTestSummary,
    KTestDetail,
    KSubmitAnswersRequest,
    KSubmitAnswersResult,
    KQuestionScoreMap,
    KUpdateTestRequest,
    KUpdateQuestionsRequest,
    KDailyQueueItem,
    KDailySessionQuestion,
    KDailySubmitRequest,
    KRetentionSummary,
    KRetentionGraph,
} from "../types/kTest.type";
import type { ResultOptions } from "../../../types";

const base = (knowledgeId: number) => `${config.api.baseURL}/api/k/${knowledgeId}`;

const _getTests = async (knowledgeId: number, nodeId?: number): Promise<KTestSummary[]> => {
    const url = nodeId != null
        ? `${base(knowledgeId)}/tests?nodeId=${nodeId}`
        : `${base(knowledgeId)}/tests`;
    const res = await apiFetch(url, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _getTestDetail = async (knowledgeId: number, testId: number): Promise<ResultOptions<KTestDetail>> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests/${testId}`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _createEmptyTest = async (
    knowledgeId: number,
    title: string,
    nodeId?: number | null,
): Promise<ResultOptions<KTestDetail>> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests/create-empty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, nodeId: nodeId ?? null }),
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _submitAnswers = async (
    knowledgeId: number,
    testId: number,
    request: KSubmitAnswersRequest
): Promise<ResultOptions<KSubmitAnswersResult>> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests/${testId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _getQuestionScores = async (knowledgeId: number): Promise<KQuestionScoreMap> => {
    const res = await apiFetch(`${base(knowledgeId)}/question-scores`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _reorderTests = async (
    knowledgeId: number,
    orderedTestIds: number[]
): Promise<ResultOptions> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderedTestIds),
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _updateTest = async (
    knowledgeId: number,
    testId: number,
    request: KUpdateTestRequest
): Promise<ResultOptions> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _updateQuestions = async (
    knowledgeId: number,
    testId: number,
    request: KUpdateQuestionsRequest
): Promise<ResultOptions> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests/${testId}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

// ── SRS / Daily Review ─────────────────────────────────────────────────────

const _getDailyQueue = async (knowledgeId: number): Promise<ResultOptions<KDailyQueueItem[]>> => {
    const res = await apiFetch(`${base(knowledgeId)}/daily-queue`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _getGlobalDailyQueue = async (): Promise<ResultOptions<KDailyQueueItem[]>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/k/global-daily-queue`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _getDailySession = async (
    knowledgeId: number,
    testId: number,
    limit = 30
): Promise<ResultOptions<KDailySessionQuestion[]>> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests/${testId}/daily-session?limit=${limit}`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _submitDailyAnswers = async (
    knowledgeId: number,
    testId: number,
    request: KDailySubmitRequest
): Promise<ResultOptions<KSubmitAnswersResult>> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests/${testId}/daily-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _updateTestStatus = async (
    knowledgeId: number,
    testId: number,
    status: string
): Promise<ResultOptions> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests/${testId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _getRetention = async (knowledgeId: number): Promise<KRetentionSummary> => {
    const res = await apiFetch(`${base(knowledgeId)}/retention`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _getRetentionGraph = async (knowledgeId: number, days = 14): Promise<KRetentionGraph> => {
    const res = await apiFetch(`${base(knowledgeId)}/retention-graph?days=${days}`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("language", "vi");
    formData.append("response_format", "text");
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${envConfig.REACT_APP_GROQ_API_KEY}` },
        body: formData,
    });
    if (!res.ok) throw new Error("Groq transcription failed");
    return res.text();
};

export const KTestService = {
    _getTests,
    _getTestDetail,
    _createEmptyTest,
    _reorderTests,
    _submitAnswers,
    _getQuestionScores,
    _updateTest,
    _updateQuestions,
    _transcribeAudio,
    _getDailyQueue,
    _getGlobalDailyQueue,
    _getDailySession,
    _submitDailyAnswers,
    _updateTestStatus,
    _getRetention,
    _getRetentionGraph,
};
