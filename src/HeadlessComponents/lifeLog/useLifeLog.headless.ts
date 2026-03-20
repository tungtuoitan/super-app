/**
 * LifeLog Headless Hook
 * Side-effects (useEffect) for LifeLog sidebar: load tracks + logs on mount
 */

import { useEffect } from "react";
import { useLifeLogLogHelper } from "@/hooks/lifeLog/useLifeLogLog.helper";
import { useLifeLogTrackHelper } from "@/hooks/lifeLog/useLifeLogTrack.helper";

export function useLifeLogHeadless() {
    const { loadLogs } = useLifeLogLogHelper();
    const { loadTracks } = useLifeLogTrackHelper();

    // Load logs on mount
    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // Load tracks on mount
    useEffect(() => {
        loadTracks();
    }, [loadTracks]);
}
