import { config } from "@/config/app.config";
import { apiFetch } from "@/services/apiClient";
import { ResultOptions } from "../types";
import type { ConTopicDTO, ConMessageDTO, UpsertTopicDTO, UpsertMessageDTO } from "@/types/conversation.types";

// ── Topics ────────────────────────────────────────────────────────────────

const _getTopics = async (
    _token: string,
    params?: { entityType?: string; entityId?: number; deletedAt?: string }
): Promise<ResultOptions<ConTopicDTO>> => {
    const q = new URLSearchParams();
    if (params?.entityType) q.append("entityType", params.entityType);
    if (params?.entityId != null) q.append("entityId", String(params.entityId));
    if (params?.deletedAt) q.append("deletedAt", params.deletedAt);
    const url = `${config.api.baseURL}/api/conversation/topics${q.toString() ? "?" + q : ""}`;
    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (res.ok) return res.json() as Promise<ResultOptions<ConTopicDTO>>;
    return Promise.reject(res);
};

const _upsertTopic = async (_token: string, data: UpsertTopicDTO): Promise<ResultOptions<ConTopicDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/conversation/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (res.ok) return res.json() as Promise<ResultOptions<ConTopicDTO>>;
    return Promise.reject(res);
};

const _deleteTopic = async (_token: string, topicId: number): Promise<ResultOptions<ConTopicDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/conversation/topics/${topicId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return res.json() as Promise<ResultOptions<ConTopicDTO>>;
    return Promise.reject(res);
};

// ── Messages ──────────────────────────────────────────────────────────────

const _getMessages = async (
    _token: string,
    params?: {
        entityType?: string;
        entityId?: number;
        topicId?: number;
        entityLevelOnly?: boolean;
        deletedAt?: string;
    }
): Promise<ResultOptions<ConMessageDTO>> => {
    const q = new URLSearchParams();
    if (params?.entityType) q.append("entityType", params.entityType);
    if (params?.entityId != null) q.append("entityId", String(params.entityId));
    if (params?.topicId != null) q.append("topicId", String(params.topicId));
    if (params?.entityLevelOnly) q.append("entityLevelOnly", "true");
    if (params?.deletedAt) q.append("deletedAt", params.deletedAt);
    const url = `${config.api.baseURL}/api/conversation/messages${q.toString() ? "?" + q : ""}`;
    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (res.ok) return res.json() as Promise<ResultOptions<ConMessageDTO>>;
    return Promise.reject(res);
};

const _upsertMessage = async (_token: string, data: UpsertMessageDTO): Promise<ResultOptions<ConMessageDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/conversation/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (res.ok) return res.json() as Promise<ResultOptions<ConMessageDTO>>;
    return Promise.reject(res);
};

const _deleteMessage = async (_token: string, messageId: number): Promise<ResultOptions<ConMessageDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/conversation/messages/${messageId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return res.json() as Promise<ResultOptions<ConMessageDTO>>;
    return Promise.reject(res);
};

const _promoteToTopic = async (
    _token: string,
    messageId: number,
    topicName: string
): Promise<ResultOptions<ConTopicDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/conversation/messages/${messageId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicName }),
    });
    if (res.ok) return res.json() as Promise<ResultOptions<ConTopicDTO>>;
    return Promise.reject(res);
};

export const conversationService = {
    _getTopics,
    _upsertTopic,
    _deleteTopic,
    _getMessages,
    _upsertMessage,
    _deleteMessage,
    _promoteToTopic,
};
