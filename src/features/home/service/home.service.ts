/**
 * Home Service — progress dashboard API (TungRoot #1481)
 *   GET /api/dashboard/activity   comments per (week, project)
 *   GET /api/dashboard/habits     trackers + entries per day (sensitive trackers only with X-Unlock-Token)
 *   GET /api/finance/summary      net worth / months / holdings from the ledger (needs X-Unlock-Token, #1482)
 *   GET /api/task/{id}            psych tracker description = question bank (full mode only)
 *   /api/security/totp/*          TOTP: status, setup, confirm, unlock → unlock token (#1489)
 */

import { config } from "config/app.config";
import { apiFetch } from "@/shared";
import type { ResultOptions } from "@/shared";
import type { ActivityWeekPointDTO, FinanceSummaryDTO, HabitSeriesDTO, TotpResult, TotpSetupDTO, TotpStatusDTO, UnlockTokenDTO } from "../types/home.types";

const UNLOCK_HEADER = "X-Unlock-Token";

const _get = async <T>(path: string, unlockToken?: string): Promise<ResultOptions<T>> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (unlockToken) headers[UNLOCK_HEADER] = unlockToken;
    const res = await apiFetch(`${config.api.baseURL}${path}`, { method: "GET", headers });
    if (res.ok) return (await res.json()) as ResultOptions<T>;
    return Promise.reject(res);
};

/** TOTP calls answer with real HTTP codes (400 wrong code, 404, 409, 423 locked) — never throw on them. */
const _totp = async <T>(method: "GET" | "POST", path: string, body?: unknown): Promise<TotpResult<T>> => {
    const res = await apiFetch(`${config.api.baseURL}/api/security/totp/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as ResultOptions<unknown> | null;
    return { status: res.status, message: json?.message ?? "", object: (json?.object ?? null) as T | null };
};

const _getActivity = (from: string, to: string) =>
    _get<ActivityWeekPointDTO>(`/api/dashboard/activity?from=${from}&to=${to}`);

/** `taskIds` → only those trackers; `excludeTaskIds` → every other repeat task. */
const _getHabits = (from: string, to: string, ids: { taskIds?: number[]; excludeTaskIds?: number[] }, unlockToken?: string) => {
    const parts = [`from=${from}`, `to=${to}`];
    if (ids.taskIds?.length) parts.push(`taskIds=${ids.taskIds.join(",")}`);
    if (ids.excludeTaskIds?.length) parts.push(`excludeTaskIds=${ids.excludeTaskIds.join(",")}`);
    return _get<HabitSeriesDTO>(`/api/dashboard/habits?${parts.join("&")}`, unlockToken);
};

/** Weekly points between two days (YYYY-MM-DD); result is in `object`. */
const _getFinance = (from: string, to: string, unlockToken: string) =>
    _get<FinanceSummaryDTO>(`/api/finance/summary?from=${from}&to=${to}&interval=week`, unlockToken);

/** One task (data[0]); used for the psych tracker's question bank. */
const _getTask = (id: number) => _get<{ id: number; description: string | null }>(`/api/task/${id}`);

const _totpStatus = () => _totp<TotpStatusDTO>("GET", "status");
const _totpSetup = () => _totp<TotpSetupDTO>("POST", "setup");
/** First code after scanning → enables TOTP and returns an unlock token. */
const _totpConfirm = (code: string) => _totp<UnlockTokenDTO>("POST", "confirm", { code });
const _totpUnlock = (code: string) => _totp<UnlockTokenDTO>("POST", "unlock", { code });

export const homeService = { _getActivity, _getHabits, _getFinance, _getTask, _totpStatus, _totpSetup, _totpConfirm, _totpUnlock };
