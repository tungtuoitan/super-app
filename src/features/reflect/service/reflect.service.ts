import { config } from "config/app.config";
import { ResultOptions, apiFetch } from "@/shared";
import { filterUtils } from "@/shell";
import type { ReflectEntryDTO, ReflectSeriesDTO, UpsertReflectEntryRequest } from "../types/reflect.types";

const URL = () => `${config.api.baseURL}/api/reflect`;

/** `createdAt` is the saved filter value ("YYYY-MM,YYYY-MM"); the server reads the months in the user's timezone */
const getEntries = async (createdAt?: string): Promise<ResultOptions<ReflectEntryDTO>> => {
    const range = filterUtils.parseDateRange(createdAt);
    const query = new URLSearchParams();
    if (range.from) query.set("createdAtFrom", range.from);
    if (range.to) query.set("createdAtTo", range.to);
    const queryText = query.toString();
    const res = await apiFetch(queryText ? `${URL()}?${queryText}` : URL(), { method: "GET", headers: { "Content-Type": "application/json" } });
    if (res.ok) return (await res.json()) as ResultOptions<ReflectEntryDTO>;
    return Promise.reject(res);
};

const upsertEntry = async (request: UpsertReflectEntryRequest): Promise<ResultOptions<ReflectEntryDTO>> => {
    const res = await apiFetch(URL(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!res.ok) return Promise.reject(res);
    const result = (await res.json()) as ResultOptions<ReflectEntryDTO>;
    // The server answers 200 even when it refuses (e.g. "I think" is locked), so check the result itself
    return result.success ? result : Promise.reject(new Error(result.message ?? "Reflect save refused"));
};

const deleteEntry = async (id: string): Promise<ResultOptions> => {
    const res = await apiFetch(`${URL()}/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return (await res.json()) as ResultOptions;
    return Promise.reject(res);
};

/** The numbers read out of the journal, one series per metric */
const getSeries = async (): Promise<ReflectSeriesDTO[]> => {
    const res = await apiFetch(`${URL()}/series`, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (res.ok) return (await res.json()) as ReflectSeriesDTO[];
    return Promise.reject(res);
};

export const reflectService = { getEntries, upsertEntry, deleteEntry, getSeries };
