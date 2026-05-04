import { config } from "config/app.config";
import { envConfig } from "config/env.config";
import type {
    KQuestionsListResponse,
    KSubmitAnswersRequest,
    KSubmitAnswersResult,
    KQuestionScoreMap,
    KUpdateQuestionsRequest,
    KDailyQueueItem,
    KDailySessionQuestion,
    KDailySubmitRequest,
    KRetentionSummary,
    KRetentionGraph,
} from "../types/kTest.type";
import { apiFetch } from "@/shared";
import { ResultOptions } from "@/shared";

const base = (knowledgeId: number) => `${config.api.baseURL}/api/k/${knowledgeId}`;

// ── Questions CRUD ─────────────────────────────────────────────────────────

const _getQuestions = async (knowledgeId: number): Promise<ResultOptions<KQuestionsListResponse>> => {
    const res = await apiFetch(`${base(knowledgeId)}/questions`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _getOrphanQuestions = async (): Promise<ResultOptions<KQuestionsListResponse>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/k/orphan-questions`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _updateOrphanQuestions = async (request: KUpdateQuestionsRequest): Promise<ResultOptions> => {
    const res = await apiFetch(`${config.api.baseURL}/api/k/orphan-questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _moveQuestion = async (questionId: number, targetNodeId: number | null): Promise<ResultOptions> => {
    const res = await apiFetch(`${config.api.baseURL}/api/k/questions/${questionId}/node`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: targetNodeId }),
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _markQuestionDraft = async (knowledgeId: number, questionId: number): Promise<ResultOptions> => {
    const res = await apiFetch(`${base(knowledgeId)}/questions/${questionId}/mark-draft`, {
        method: "PATCH",
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _updateQuestions = async (
    knowledgeId: number,
    request: KUpdateQuestionsRequest,
): Promise<ResultOptions> => {
    const res = await apiFetch(`${base(knowledgeId)}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _submitAnswers = async (
    knowledgeId: number,
    request: KSubmitAnswersRequest,
): Promise<ResultOptions<KSubmitAnswersResult>> => {
    const res = await apiFetch(`${base(knowledgeId)}/questions/submit`, {
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
    limit = 30,
): Promise<ResultOptions<KDailySessionQuestion[]>> => {
    const res = await apiFetch(`${base(knowledgeId)}/daily-session?limit=${limit}`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _submitDailyAnswers = async (
    knowledgeId: number,
    request: KDailySubmitRequest,
): Promise<ResultOptions<KSubmitAnswersResult>> => {
    const res = await apiFetch(`${base(knowledgeId)}/daily-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

// ── Retention ──────────────────────────────────────────────────────────────

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

// ── Audio (unchanged) ──────────────────────────────────────────────────────

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
    _getQuestions,
    _getOrphanQuestions,
    _updateQuestions,
    _updateOrphanQuestions,
    _moveQuestion,
    _markQuestionDraft,
    _submitAnswers,
    _getQuestionScores,
    _getDailyQueue,
    _getGlobalDailyQueue,
    _getDailySession,
    _submitDailyAnswers,
    _getRetention,
    _getRetentionGraph,
    _transcribeAudio,
};
