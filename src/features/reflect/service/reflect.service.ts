import { config } from "config/app.config";
import { ResultOptions, apiFetch } from "@/shared";
import type { ReflectEntryDTO, UpsertReflectEntryRequest } from "../types/reflect.types";

const URL = () => `${config.api.baseURL}/api/reflect`;

const getEntries = async (): Promise<ResultOptions<ReflectEntryDTO>> => {
    const res = await apiFetch(URL(), { method: "GET", headers: { "Content-Type": "application/json" } });
    if (res.ok) return (await res.json()) as ResultOptions<ReflectEntryDTO>;
    return Promise.reject(res);
};

const upsertEntry = async (request: UpsertReflectEntryRequest): Promise<ResultOptions<ReflectEntryDTO>> => {
    const res = await apiFetch(URL(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (res.ok) return (await res.json()) as ResultOptions<ReflectEntryDTO>;
    return Promise.reject(res);
};

const deleteEntry = async (id: string): Promise<ResultOptions> => {
    const res = await apiFetch(`${URL()}/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return (await res.json()) as ResultOptions;
    return Promise.reject(res);
};

export const reflectService = { getEntries, upsertEntry, deleteEntry };
