import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Dispatch, SetStateAction } from "react";
import { zSetter } from "@/shared";
import { homeConstants } from "../home.constants";
import { toDateKey } from "../utils/home.utils";
import type { ActivityWeekPointDTO, FinanceSummaryDTO, HabitSeriesDTO, PrivacyMode } from "../types/home.types";

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
