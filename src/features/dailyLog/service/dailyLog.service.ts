import { config } from "config/app.config";
import { ResultOptions, apiFetch } from "@/shared";

export interface DailyLogDTO {
    id: number;
    userId: number;
    logDate: string;
    valuesJson: string;
    templateJson?: string | null;
    createdAt: string;
    updatedAt?: string | null;
    deletedAt?: string | null;
}

export interface DailyLogFieldTemplateDTO {
    id: number;
    userId: number;
    section: string;
    fieldKey: string;
    label: string;
    fieldType: string;
    rangeMin?: number | null;
    rangeMax?: number | null;
    sortOrder: number;
    createdAt: string;
    updatedAt?: string | null;
    deletedAt?: string | null;
}

export interface DailyLogHistoryPointDTO {
    logDate: string;
    value: string;
}

const getLogs = async (
    _token: string,
    params?: { from?: string; to?: string; deletedAt?: string }
): Promise<ResultOptions<DailyLogDTO>> => {
    const qp = new URLSearchParams();
    if (params?.from) qp.append("from", params.from);
    if (params?.to) qp.append("to", params.to);
    if (params?.deletedAt) qp.append("deletedAt", params.deletedAt);
    const query = qp.toString();
    const url = query ? `${config.api.baseURL}/api/daily-log?${query}` : `${config.api.baseURL}/api/daily-log`;

    const res = await apiFetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (res.ok) return (await res.json()) as ResultOptions<DailyLogDTO>;
    return Promise.reject(res);
};

const getLogByDate = async (_token: string, date: string): Promise<ResultOptions<DailyLogDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/daily-log/${date}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return (await res.json()) as ResultOptions<DailyLogDTO>;
    return Promise.reject(res);
};

const upsertLog = async (
    _token: string,
    request: { logDate: string; valuesJson: string; templateJson?: string | null; deletedAt?: string | null }
): Promise<ResultOptions<DailyLogDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/daily-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (res.ok) return (await res.json()) as ResultOptions<DailyLogDTO>;
    return Promise.reject(res);
};

const getFieldHistory = async (
    _token: string,
    fieldKey: string,
    from?: string,
    to?: string
): Promise<ResultOptions<DailyLogHistoryPointDTO>> => {
    const qp = new URLSearchParams();
    qp.append("fieldKey", fieldKey);
    if (from) qp.append("from", from);
    if (to) qp.append("to", to);
    const res = await apiFetch(`${config.api.baseURL}/api/daily-log/history?${qp.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return (await res.json()) as ResultOptions<DailyLogHistoryPointDTO>;
    return Promise.reject(res);
};

const getTemplate = async (_token: string): Promise<ResultOptions<DailyLogFieldTemplateDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/daily-log-template`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return (await res.json()) as ResultOptions<DailyLogFieldTemplateDTO>;
    return Promise.reject(res);
};

const upsertTemplate = async (
    _token: string,
    requests: Array<{
        id?: number;
        section: string;
        fieldKey: string;
        label: string;
        fieldType: string;
        rangeMin?: number | null;
        rangeMax?: number | null;
        sortOrder: number;
        deletedAt?: string | null;
    }>
): Promise<ResultOptions<DailyLogFieldTemplateDTO>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/daily-log-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requests),
    });
    if (res.ok) return (await res.json()) as ResultOptions<DailyLogFieldTemplateDTO>;
    return Promise.reject(res);
};

export const dailyLogService = {
    getLogs,
    getLogByDate,
    upsertLog,
    getFieldHistory,
    getTemplate,
    upsertTemplate,
};
