/**
 * Home Service — progress dashboard API (TungRoot #1481)
 *   GET /api/dashboard/activity   comments per (week, project)
 *   GET /api/dashboard/habits     trackers + entries per day
 *   GET /api/finance/summary      net worth / months / holdings from the ledger (full mode only, #1482)
 *   GET /api/task/{id}            psych tracker description = question bank (full mode only)
 */

import { config } from "config/app.config";
import { apiFetch } from "@/shared";
import type { ResultOptions } from "@/shared";
import type { ActivityWeekPointDTO, FinanceSummaryDTO, HabitSeriesDTO } from "../types/home.types";

const _get = async <T>(path: string): Promise<ResultOptions<T>> => {
    const res = await apiFetch(`${config.api.baseURL}${path}`, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (res.ok) return (await res.json()) as ResultOptions<T>;
    return Promise.reject(res);
};

const _getActivity = (from: string, to: string) =>
    _get<ActivityWeekPointDTO>(`/api/dashboard/activity?from=${from}&to=${to}`);

/** `taskIds` → only those trackers; `excludeTaskIds` → every other repeat task. */
const _getHabits = (from: string, to: string, ids: { taskIds?: number[]; excludeTaskIds?: number[] }) => {
    const parts = [`from=${from}`, `to=${to}`];
    if (ids.taskIds?.length) parts.push(`taskIds=${ids.taskIds.join(",")}`);
    if (ids.excludeTaskIds?.length) parts.push(`excludeTaskIds=${ids.excludeTaskIds.join(",")}`);
    return _get<HabitSeriesDTO>(`/api/dashboard/habits?${parts.join("&")}`);
};

/** Weekly points between two days (YYYY-MM-DD); result is in `object`. */
const _getFinance = (from: string, to: string) =>
    _get<FinanceSummaryDTO>(`/api/finance/summary?from=${from}&to=${to}&interval=week`);

/** One task (data[0]); used for the psych tracker's question bank. */
const _getTask = (id: number) => _get<{ id: number; description: string | null }>(`/api/task/${id}`);

export const homeService = { _getActivity, _getHabits, _getFinance, _getTask };
