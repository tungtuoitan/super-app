/**
 * LifeLog Track Selector
 * Derived/computed data for tracks
 */

import { useMemo } from "react";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";

export function useLifeLogTrackSelector() {
    const { tracks, logs } = useLifeLogStore();

    /** Active tracks sorted by usage count (desc) */
    const sortedTracks = useMemo(() => {
        const active = tracks.filter((t) => !t.deletedAt);
        const usageMap = new Map<number, number>();
        for (const log of logs) {
            if (log.trackId) usageMap.set(log.trackId, (usageMap.get(log.trackId) ?? 0) + 1);
        }
        return [...active].sort((a, b) => (usageMap.get(b.id) ?? 0) - (usageMap.get(a.id) ?? 0));
    }, [tracks, logs]);

    return { sortedTracks };
}
