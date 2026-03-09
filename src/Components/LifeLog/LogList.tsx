/**
 * LogList - Scrollable list of log entries
 */

import { useEffect, useCallback } from "react";
import { Plus, RefreshCw, Loader2, BarChart2 } from "lucide-react";
import { useLifeLogLogHelper } from "@/hooks/lifeLog/useLifeLogLog.helper";
import { useLifeLogTabHelper } from "@/hooks/lifeLog/useLifeLogTab.helper";
import { LogItem } from "./LogItem";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { useMobileStore } from "@/store/mobile/Mobile.store";
import type { LifeLogLog } from "@/types/lifeLog.types";
import { useLifeLogTrackHelper } from "@/hooks/lifeLog/useLifeLogTrack.helper";

export function LogList() {
    const { logs, tracks, isLoading } = useLifeLogStore();
    const { loadLogs, deleteLog } = useLifeLogLogHelper();
    const { openLogTab, openNewLogTab } = useLifeLogTabHelper();
    const { searchQuery } = useGridControlStore();
    const { isMobile } = useMobileStore();

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleAddLog = useCallback(() => {
        openNewLogTab();
    }, [openNewLogTab]);

    const activeLogs = logs.filter((l) => !l.deletedAt);
    const filtered = searchQuery.trim()
        ? activeLogs.filter((l) => {
              const q = searchQuery.toLowerCase();
              return (l.title ?? "").toLowerCase().includes(q) || (l.description ?? "").toLowerCase().includes(q);
          })
        : activeLogs;

    const { loadTracks } = useLifeLogTrackHelper();
    const { openGraphTab, openNewTrackTab } = useLifeLogTabHelper();

    useEffect(() => {
        loadTracks();
    }, [loadTracks]);

    const handleAddTrack = useCallback(() => {
        openNewTrackTab();
    }, [openNewTrackTab]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Logs {activeLogs.length > 0 && `(${activeLogs.length})`}</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => loadLogs()}
                        className={`rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ${isMobile ? "p-2" : "p-0.5"}`}
                        title="Refresh"
                    >
                        <RefreshCw className={isMobile ? "w-4 h-4" : "w-3 h-3"} />
                    </button>
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
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                        {searchQuery ? (
                            <p className="text-xs">No results for "{searchQuery}"</p>
                        ) : (
                            <>
                                <p className="text-xs">No logs yet.</p>
                                <button onClick={handleAddLog} className="text-xs text-primary hover:underline mt-1">
                                    Add your first log
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    filtered.map((log, i) => {
                        const track = log.trackId ? tracks.find((t) => t.id === log.trackId) : undefined;
                        const prev = filtered[i - 1];
                        const gapMs = prev ? new Date(prev.createdAt).getTime() - new Date(log.createdAt).getTime() : 0;
                        const gapHours = gapMs / 3_600_000;
                        const marginTop = gapHours < 1 ? 0 : gapHours < 6 ? 4 : gapHours < 24 ? 8 : gapHours < 72 ? 12 : gapHours < 168 ? 18 : 24;
                        return (
                            <div key={log.id} style={marginTop ? { marginTop } : undefined}>
                                <LogItem log={log} trackEmoji={track?.emoji} trackColor={track?.color} onClick={openLogTab} onDelete={(l: LifeLogLog) => deleteLog(l.id)} />
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
