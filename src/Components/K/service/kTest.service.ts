import { config } from "@/config/app.config";
import { envConfig } from "@/config/env.config";
import { apiFetch } from "@/services/apiClient";
import type {
    KTestSummary,
    KTestDetail,
    KCreateTestFromNodesRequest,
    KSubmitAnswersRequest,
    KSubmitAnswersResult,
    KNodeScoreMap,
    KUpdateTestRequest,
    KUpdateTestNodesRequest,
} from "../types/kTest.type";
import type { ResultOptions } from "../../../types";

const base = (knowledgeId: number) => `${config.api.baseURL}/api/k/${knowledgeId}`;

const _getTests = async (knowledgeId: number): Promise<KTestSummary[]> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _getTestDetail = async (knowledgeId: number, testId: number): Promise<ResultOptions<KTestDetail>> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests/${testId}`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _createTestFromNodes = async (
    knowledgeId: number,
    request: KCreateTestFromNodesRequest
): Promise<ResultOptions<KTestDetail>> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
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

const _getNodeScores = async (knowledgeId: number): Promise<KNodeScoreMap> => {
    const res = await apiFetch(`${base(knowledgeId)}/node-scores`, { method: "GET" });
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

const _updateTestNodes = async (
    knowledgeId: number,
    testId: number,
    request: KUpdateTestNodesRequest
): Promise<ResultOptions> => {
    const res = await apiFetch(`${base(knowledgeId)}/tests/${testId}/nodes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
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
    _createTestFromNodes,
    _submitAnswers,
    _getNodeScores,
    _updateTest,
    _updateTestNodes,
    _transcribeAudio,
};
