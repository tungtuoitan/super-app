/**
 * TrackPanel - Horizontal scrollable list of tracks for quick tap-logging
 * Tracks are sorted by usage count (desc) derived from logs in store
 */

import { useEffect, useCallback, useMemo } from "react";
import { Plus, BarChart2 } from "lucide-react";
import { useLifeLogTrackHelper } from "@/hooks/lifeLog/useLifeLogTrack.helper";
import { useLifeLogTabHelper } from "@/hooks/lifeLog/useLifeLogTab.helper";
import { TrackItem } from "./TrackItem";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import { useMobileStore } from "@/store/mobile/Mobile.store";

export function TrackPanel() {
    const { tracks, logs } = useLifeLogStore();
    const { loadTracks } = useLifeLogTrackHelper();
    const { openGraphTab, openNewTrackTab } = useLifeLogTabHelper();
    const { isMobile } = useMobileStore();

    useEffect(() => {
        loadTracks();
    }, [loadTracks]);

    const handleAddTrack = useCallback(() => {
        openNewTrackTab();
    }, [openNewTrackTab]);

    const sortedTracks = useMemo(() => {
        const active = tracks.filter((t) => !t.deletedAt);
        const usageMap = new Map<number, number>();
        for (const log of logs) {
            if (log.trackId) usageMap.set(log.trackId, (usageMap.get(log.trackId) ?? 0) + 1);
        }
        return [...active].sort((a, b) => (usageMap.get(b.id) ?? 0) - (usageMap.get(a.id) ?? 0));
    }, [tracks, logs]);

    return (
        <div className="border-b border-border flex-shrink-0 flex items-center" style={{ borderTop: "1px solid rgb(63, 63, 70)" }}>
            {/* Scrollable track list */}
            <div className="flex-1 flex  overflow-x-auto scrollbar-hide items-left min-w-0">
                 <div className="flex items-center flex-col justify-center pr-1 gap-1 flex-shrink-0 border-l border-border pl-2">
                    <button
                        onClick={openGraphTab}
                        className={`rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ${isMobile ? "p-2" : "p-1"}`}
                        title="Track activity graph"
                    >
                        <BarChart2 className={isMobile ? "w-3.5 h-3.5" : "w-3.5 h-3.5"} />
                    </button>
                    <button
                        onClick={() => handleAddTrack()}
                        className={`rounded border border-border  text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ${isMobile ? "p-2" : "p-1"}`}
                        title="Add track"
                    >
                        <Plus className={isMobile ? "w-3.5 h-3.5" : "w-3.5 h-3.5"} />
                    </button>

                 </div>
                {sortedTracks.length === 0 && (
                    <p className="text-xs text-muted-foreground italic flex-shrink-0">No tracks yet.</p>
                )}
                {sortedTracks.map((track) => (
                    <TrackItem key={track.id} track={track} />
                ))}
            </div>

            {/* Fixed buttons on the right */}
            {/* <div className="flex items-center flex-col pr-1 gap-1 flex-shrink-0 border-l border-border">
                <button
                    onClick={openGraphTab}
                    className={`rounded border border-border bg-black text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ${isMobile ? "p-2" : "p-1"}`}
                    title="Track activity graph"
                >
                    <BarChart2 className={isMobile ? "w-4 h-4" : "w-3.5 h-3.5"} />
                </button>
                <button
                    onClick={() => setCreateOpen(true)}
                    className={`rounded border border-border bg-black  text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ${isMobile ? "p-2" : "p-1"}`}
                    title="Add track"
                >
                    <Plus className={isMobile ? "w-5 h-5" : "w-3.5 h-3.5"} />
                </button>
            </div> */}

        </div>
    );
}
