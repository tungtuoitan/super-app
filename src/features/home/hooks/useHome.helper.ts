/**
 * Home helper — load data and switch privacy mode (TungRoot #1481).
 * Reads state imperatively (getHomeState) so timers/listeners always see fresh values.
 */

import { homeConstants } from "../home.constants";
import { getHomeState } from "../store/useHome.store";
import { homeService } from "../service/home.service";
import { addMonths, buildWeekKeys, monthKey, toDateKey } from "../utils/home.utils";
import type { HomeView } from "../types/home.types";

const describeError = (e: unknown) => (e instanceof Response ? `HTTP ${e.status}` : e instanceof Error ? e.message : String(e));

export function useHomeHelper() {
    /** Public data: activity + allowlisted trackers. Safe to show in private mode. */
    const loadPublic = async () => {
        const { setActivity, setPublicHabits, setIsLoading, setError, setLoadedAt, setTodayKey } = getHomeState();
        const todayKey = toDateKey(new Date());
        const from = buildWeekKeys(todayKey, homeConstants.activityWeeks)[0];
        setTodayKey(todayKey);
        setIsLoading(true);
        try {
            const [activity, habits] = await Promise.all([
                homeService._getActivity(from, todayKey),
                homeService._getHabits(from, todayKey, { taskIds: homeConstants.publicTrackerIds }),
            ]);
            setActivity(activity.data ?? []);
            setPublicHabits(habits.data ?? []);
            setError(null);
            setLoadedAt(Date.now());
        } catch (e) {
            setError(describeError(e));
        } finally {
            setIsLoading(false);
        }
    };

    /** Fetch sensitive data, then show it for `fullDurationMinutes`. Nothing sensitive is kept on failure. */
    const unlock = async () => {
        const { todayKey, fullDurationMinutes, setSensitiveHabits, setFinance, setPsychDescription, setPrivacyMode, setFullUntil, setNowMs, setIsUnlocking, setError } = getHomeState();
        const from = buildWeekKeys(todayKey, homeConstants.activityWeeks)[0];
        const toMonth = monthKey(todayKey);
        setIsUnlocking(true);
        try {
            const [habits, finance, psychTask] = await Promise.all([
                homeService._getHabits(from, todayKey, { excludeTaskIds: homeConstants.publicTrackerIds }),
                homeService._getFinance(`${addMonths(toMonth, -(homeConstants.financeMonths - 1))}-01`, todayKey),
                // the bank only shapes the Tâm lý view — a missing tracker must not block unlocking
                homeService._getTask(homeConstants.psychTrackerId).catch(() => null),
            ]);
            // lock() while the request was in flight → drop the response
            if (!getHomeState().isUnlocking) return;
            const now = Date.now();
            setSensitiveHabits(habits.data ?? []);
            setFinance(finance.object ?? null);
            setPsychDescription(psychTask?.data?.[0]?.description ?? null);
            setNowMs(now);
            setFullUntil(now + fullDurationMinutes * 60 * 1000);
            setPrivacyMode("full");
            setError(null);
        } catch (e) {
            lock();
            setError(describeError(e));
        } finally {
            getHomeState().setIsUnlocking(false);
        }
    };

    /** Back to private: wipe every sensitive value from memory. */
    const lock = () => {
        const { setSensitiveHabits, setFinance, setPsychDescription, setPrivacyMode, setFullUntil, setIsUnlocking } = getHomeState();
        setIsUnlocking(false);
        setPrivacyMode("private");
        setFullUntil(null);
        setSensitiveHabits(null);
        setFinance(null);
        setPsychDescription(null);
    };

    /** Full → private; private → full; a click while unlocking cancels it. */
    const togglePrivacy = () => {
        const { privacyMode, isUnlocking } = getHomeState();
        if (privacyMode === "full" || isUnlocking) return lock();
        return unlock();
    };

    /** Restart the full-mode countdown (no refetch). */
    const extendFull = () => {
        const { privacyMode, fullDurationMinutes, setFullUntil, setNowMs } = getHomeState();
        if (privacyMode !== "full") return;
        const now = Date.now();
        setNowMs(now);
        setFullUntil(now + fullDurationMinutes * 60 * 1000);
    };

    const changeFullDuration = (minutes: number) => {
        getHomeState().setFullDurationMinutes(minutes);
        extendFull();
    };

    /** Called every countdown tick: advance the clock and lock when time is up. */
    const tick = () => {
        const { privacyMode, fullUntil, setNowMs } = getHomeState();
        if (privacyMode !== "full") return;
        const now = Date.now();
        if (!fullUntil || now >= fullUntil) {
            lock();
            return;
        }
        setNowMs(now);
    };

    /** Reload public data when the day changes or data is stale. */
    const refreshIfNeeded = (maxAgeMs: number) => {
        const { todayKey, loadedAt, isLoading } = getHomeState();
        if (isLoading) return;
        const dayChanged = toDateKey(new Date()) !== todayKey;
        const stale = !loadedAt || Date.now() - loadedAt > maxAgeMs;
        if (dayChanged || stale) loadPublic();
    };

    /** Open a tab; opening the tab you are on goes back to the overview. */
    const toggleView = (view: HomeView) => {
        const { view: current, setView } = getHomeState();
        setView(current === view ? "overview" : view);
    };

    const showView = (view: HomeView) => getHomeState().setView(view);

    return { loadPublic, unlock, lock, togglePrivacy, extendFull, changeFullDuration, tick, refreshIfNeeded, toggleView, showView };
}
