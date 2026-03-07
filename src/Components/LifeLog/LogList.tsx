/**
 * LogList - Scrollable list of log entries
 */

import { useEffect, useCallback } from "react";
import { Plus, RefreshCw, Loader2 } from "lucide-react";
import { useLifeLogLogHelper } from "@/hooks/lifeLog/useLifeLogLog.helper";
import { useLifeLogTabHelper } from "@/hooks/lifeLog/useLifeLogTab.helper";
import { LogItem } from "./LogItem";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { useMobileStore } from "@/store/mobile/Mobile.store";
import { toLocalISOString } from "@/utils/date.utils";
import type { LifeLogLog } from "@/types/lifeLog.types";

export function LogList() {
    const { logs, tracks, isLoading } = useLifeLogStore();
    const { loadLogs, createLog, deleteLog } = useLifeLogLogHelper();
    const { openLogTab } = useLifeLogTabHelper();
    const { searchQuery } = useGridControlStore();
    const { isMobile } = useMobileStore();

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleAddLog = useCallback(async () => {
        const saved = await createLog({
            id: 0,
            type: "note",
            title: "",
            isSensitive: false,
            occurAt: toLocalISOString(new Date()) ?? undefined,
        });
        if (saved) openLogTab(saved);
    }, [createLog, openLogTab]);

    const activeLogs = logs.filter((l) => !l.deletedAt);
    const filtered = searchQuery.trim()
        ? activeLogs.filter((l) => {
              const q = searchQuery.toLowerCase();
              return (l.title ?? "").toLowerCase().includes(q) || (l.description ?? "").toLowerCase().includes(q);
          })
        : activeLogs;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                    Logs {activeLogs.length > 0 && `(${activeLogs.length})`}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => loadLogs()}
                        className={`rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ${isMobile ? "p-2" : "p-0.5"}`}
                        title="Refresh"
                    >
                        <RefreshCw className={isMobile ? "w-4 h-4" : "w-3 h-3"} />
                    </button>
                    <button
                        onClick={handleAddLog}
                        className={`rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ${isMobile ? "p-2" : "p-0.5"}`}
                        title="Add log"
                    >
                        <Plus className={isMobile ? "w-5 h-5" : "w-3.5 h-3.5"} />
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
                                <button
                                    onClick={handleAddLog}
                                    className="text-xs text-primary hover:underline mt-1"
                                >
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
                        const marginTop =
                            gapHours < 1 ? 0 :
                            gapHours < 6 ? 4 :
                            gapHours < 24 ? 8 :
                            gapHours < 72 ? 12 :
                            gapHours < 168 ? 18 : 24;
                        return (
                            <div key={log.id} style={marginTop ? { marginTop } : undefined}>
                                <LogItem
                                    log={log}
                                    trackEmoji={track?.emoji}
                                    trackColor={track?.color}
                                    onClick={openLogTab}
                                    onDelete={(l: LifeLogLog) => deleteLog(l.id)}
                                />
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

