import { config } from "config/app.config";
import { apiFetch, ResultOptions } from "@/shared";
import type { KAttachment } from "../types/kAttachment.type";

const base = `${config.api.baseURL}/api/k/attachments`;

const _listAll = async (): Promise<ResultOptions<KAttachment[]>> => {
    const res = await apiFetch(base, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _listForNode = async (nodeId: number): Promise<ResultOptions<KAttachment[]>> => {
    const res = await apiFetch(`${base}/node/${nodeId}`, { method: "GET" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _linkToQuestion = async (questionId: number, attachmentId: number): Promise<ResultOptions> => {
    const res = await apiFetch(`${base}/question/${questionId}/${attachmentId}`, { method: "POST" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _unlinkFromQuestion = async (questionId: number, attachmentId: number): Promise<ResultOptions> => {
    const res = await apiFetch(`${base}/question/${questionId}/${attachmentId}`, { method: "DELETE" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _linkToNode = async (nodeId: number, attachmentId: number): Promise<ResultOptions> => {
    const res = await apiFetch(`${base}/node/${nodeId}/${attachmentId}`, { method: "POST" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

const _unlinkFromNode = async (nodeId: number, attachmentId: number): Promise<ResultOptions> => {
    const res = await apiFetch(`${base}/node/${nodeId}/${attachmentId}`, { method: "DELETE" });
    if (res.ok) return res.json();
    return Promise.reject(res);
};

export const KAttachmentService = {
    _listAll,
    _listForNode,
    _linkToQuestion,
    _unlinkFromQuestion,
    _linkToNode,
    _unlinkFromNode,
};
