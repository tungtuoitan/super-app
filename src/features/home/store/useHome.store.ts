import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Dispatch, SetStateAction } from "react";
import { zSetter } from "@/shared";
import { homeConstants } from "../home.constants";
import { toDateKey } from "../utils/home.utils";
import type { ActivityWeekPointDTO, FinanceSummaryDTO, HabitSeriesDTO, HomeView, PrivacyMode, TotpDialogMode } from "../types/home.types";

/**
 * Home (progress dashboard) state — TungRoot #1481.
 * Sensitive data (`sensitiveHabits`, `finance`) only exists while privacyMode = "full";
 * lock() wipes it. Privacy mode is never persisted: every load starts private.
 */
export interface HomeContextData {
    activity: ActivityWeekPointDTO[];
    setActivity: Dispatch<SetStateAction<ActivityWeekPointDTO[]>>;
    publicHabits: HabitSeriesDTO[];
    setPublicHabits: Dispatch<SetStateAction<HabitSeriesDTO[]>>;
    sensitiveHabits: HabitSeriesDTO[] | null;
    setSensitiveHabits: Dispatch<SetStateAction<HabitSeriesDTO[] | null>>;
    finance: FinanceSummaryDTO | null;
    setFinance: Dispatch<SetStateAction<FinanceSummaryDTO | null>>;
    /** Description (HTML) of the psych tracker — holds the question bank. Full mode only. */
    psychDescription: string | null;
    setPsychDescription: Dispatch<SetStateAction<string | null>>;
    /** Current tab (overview or one section expanded) */
    view: HomeView;
    setView: Dispatch<SetStateAction<HomeView>>;

    /** Proof of a fresh TOTP code (#1489) — sent with private requests, wiped with the sensitive data */
    unlockToken: string | null;
    setUnlockToken: Dispatch<SetStateAction<string | null>>;
    totpMode: TotpDialogMode;
    setTotpMode: Dispatch<SetStateAction<TotpDialogMode>>;
    /** otpauth:// link + secret while setting TOTP up (shown as QR) */
    totpUri: string | null;
    setTotpUri: Dispatch<SetStateAction<string | null>>;
    totpSecret: string | null;
    setTotpSecret: Dispatch<SetStateAction<string | null>>;
    totpQr: string | null;
    setTotpQr: Dispatch<SetStateAction<string | null>>;
    totpError: string | null;
    setTotpError: Dispatch<SetStateAction<string | null>>;
    totpLockedUntil: string | null;
    setTotpLockedUntil: Dispatch<SetStateAction<string | null>>;
    totpBusy: boolean;
    setTotpBusy: Dispatch<SetStateAction<boolean>>;

    privacyMode: PrivacyMode;
    setPrivacyMode: Dispatch<SetStateAction<PrivacyMode>>;
    /** Epoch ms when full mode ends */
    fullUntil: number | null;
    setFullUntil: Dispatch<SetStateAction<number | null>>;
    fullDurationMinutes: number;
    setFullDurationMinutes: Dispatch<SetStateAction<number>>;
    /** Ticks every second while in full mode (drives the countdown) */
    nowMs: number;
    setNowMs: Dispatch<SetStateAction<number>>;

    todayKey: string;
    setTodayKey: Dispatch<SetStateAction<string>>;
    isLoading: boolean;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
    isUnlocking: boolean;
    setIsUnlocking: Dispatch<SetStateAction<boolean>>;
    error: string | null;
    setError: Dispatch<SetStateAction<string | null>>;
    loadedAt: number | null;
    setLoadedAt: Dispatch<SetStateAction<number | null>>;
}

const _store = create<HomeContextData>((set, get) => ({
    activity: [],
    setActivity: zSetter("activity", set, get),
    publicHabits: [],
    setPublicHabits: zSetter("publicHabits", set, get),
    sensitiveHabits: null,
    setSensitiveHabits: zSetter("sensitiveHabits", set, get),
    finance: null,
    setFinance: zSetter("finance", set, get),
    psychDescription: null,
    setPsychDescription: zSetter("psychDescription", set, get),
    view: "overview",
    setView: zSetter("view", set, get),

    unlockToken: null,
    setUnlockToken: zSetter("unlockToken", set, get),
    totpMode: "closed",
    setTotpMode: zSetter("totpMode", set, get),
    totpUri: null,
    setTotpUri: zSetter("totpUri", set, get),
    totpSecret: null,
    setTotpSecret: zSetter("totpSecret", set, get),
    totpQr: null,
    setTotpQr: zSetter("totpQr", set, get),
    totpError: null,
    setTotpError: zSetter("totpError", set, get),
    totpLockedUntil: null,
    setTotpLockedUntil: zSetter("totpLockedUntil", set, get),
    totpBusy: false,
    setTotpBusy: zSetter("totpBusy", set, get),

    privacyMode: "private",
    setPrivacyMode: zSetter("privacyMode", set, get),
    fullUntil: null,
    setFullUntil: zSetter("fullUntil", set, get),
    fullDurationMinutes: homeConstants.fullModeDefaultMinutes,
    setFullDurationMinutes: zSetter("fullDurationMinutes", set, get),
    nowMs: Date.now(),
    setNowMs: zSetter("nowMs", set, get),

    todayKey: toDateKey(new Date()),
    setTodayKey: zSetter("todayKey", set, get),
    isLoading: false,
    setIsLoading: zSetter("isLoading", set, get),
    isUnlocking: false,
    setIsUnlocking: zSetter("isUnlocking", set, get),
    error: null,
    setError: zSetter("error", set, get),
    loadedAt: null,
    setLoadedAt: zSetter("loadedAt", set, get),
}));

export const useHomeStore = () => _store(useShallow((s) => s));
export const getHomeState = () => _store.getState();
