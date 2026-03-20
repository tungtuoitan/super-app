/**
 * TrackTimelineSheet / TrackGraphContent
 * Reusable graph content (used in both Dialog and Tab)
 * Graph modes: frequency (scatter) | count (bar)
 */

import { useMemo, useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Checkbox } from "@/Components/ui/checkbox";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import { useLifeLogTabHelper } from "@/hooks/lifeLog/useLifeLogTab.helper";
import { TrackIconDisplay } from "./small/TrackIconDisplay";
import { format, subDays, startOfDay, differenceInCalendarDays } from "date-fns";
import { BarChart2, Activity, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveTrackColor } from "@/utils/lifeLog.utils";
import { DATE_RANGE_OPTIONS } from "@/utils/lifeLog.constants";
import { CountChart } from "./small/CountChart";
import { FrequencyChart } from "./small/FrequencyChart";
import type { GraphMode } from "@/types/lifeLog.types";

// ── Shared content ─────────────────────────────────────────────────────────

export function TrackGraphContent() {
    const { tracks, logs } = useLifeLogStore();
    const { openLogTab } = useLifeLogTabHelper();

    const activeTracks = useMemo(() => tracks.filter((t) => !t.deletedAt), [tracks]);

    const tracksByUsage = useMemo(() => {
        const usageMap = new Map<number, number>();
        for (const log of logs) {
            if (log.trackId && !log.deletedAt) usageMap.set(log.trackId, (usageMap.get(log.trackId) ?? 0) + 1);
        }
        return [...activeTracks].sort((a, b) => (usageMap.get(b.id) ?? 0) - (usageMap.get(a.id) ?? 0));
    }, [activeTracks, logs]);

    const [selectedIds, setSelectedIds] = useState<Set<number>>(() =>
        new Set(tracksByUsage.slice(0, 5).map((t) => t.id))
    );
    const didInit = useRef(false);
    useEffect(() => {
        if (!didInit.current && tracksByUsage.length > 0) {
            setSelectedIds(new Set(tracksByUsage.slice(0, 5).map((t) => t.id)));
            didInit.current = true;
        }
    }, [tracksByUsage]);

    const [graphMode, setGraphMode] = useState<GraphMode>("frequency");
    const [dateRangeDays, setDateRangeDays] = useState<number | null>(30);
    const [checklistOpen, setChecklistOpen] = useState(false);
    const [dateDropOpen, setDateDropOpen] = useState(false);
    const checklistRef = useRef<HTMLDivElement>(null);
    const dateRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (checklistRef.current && !checklistRef.current.contains(e.target as Node)) setChecklistOpen(false);
            if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateDropOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const toggleTrack = (id: number) => setSelectedIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const selectedTracks = tracksByUsage.filter((t) => selectedIds.has(t.id));

    const days = useMemo(() => {
        if (dateRangeDays === null) {
            const earliest = logs.reduce((min, l) => {
                if (l.deletedAt) return min;
                const d = new Date(l.createdAt).getTime();
                return d < min ? d : min;
            }, Date.now());
            return Math.max(differenceInCalendarDays(new Date(), new Date(earliest)) + 1, 1);
        }
        return dateRangeDays;
    }, [dateRangeDays, logs]);

    const countData = useMemo(() => Array.from({ length: days }, (_, i) => {
        const d = startOfDay(subDays(new Date(), days - 1 - i));
        const dayStart = d.getTime();
        const dayEnd = dayStart + 86_400_000;
        const point: Record<string, string | number> = { dateLabel: format(d, "dd/MM") };
        for (const track of selectedTracks) {
            point[String(track.id)] = logs.filter((l) => {
                if (l.trackId !== track.id || l.deletedAt) return false;
                const t = new Date(l.createdAt).getTime();
                return t >= dayStart && t < dayEnd;
            }).length;
        }
        return point;
    }), [logs, selectedTracks, days]);

    const freqData = useMemo(() => {
        const startMs = startOfDay(subDays(new Date(), days - 1)).getTime();
        return selectedTracks.map((track, trackIdx) => {
            const dayMap = new Map<number, { count: number; logIds: number[] }>();
            for (const log of logs) {
                if (log.trackId !== track.id || log.deletedAt) continue;
                const t = new Date(log.createdAt).getTime();
                if (t < startMs) continue;
                const dayIdx = Math.floor((t - startMs) / 86_400_000);
                const entry = dayMap.get(dayIdx) ?? { count: 0, logIds: [] };
                entry.count++;
                entry.logIds.push(log.id);
                dayMap.set(dayIdx, entry);
            }
            const points: { x: number; y: number; count: number; logIds: number[] }[] = [];
            dayMap.forEach(({ count, logIds }, dayIdx) => {
                points.push({ x: dayIdx, y: trackIdx, count, logIds });
            });
            return { track, trackIdx, points };
        });
    }, [logs, selectedTracks, days]);

    const freqXTicks = useMemo(() => {
        const step = days <= 14 ? 1 : days <= 30 ? 3 : days <= 90 ? 7 : 14;
        return Array.from({ length: Math.ceil(days / step) }, (_, i) => {
            const idx = i * step;
            const date = subDays(new Date(), days - 1 - idx);
            const d = date.getDate();
            const isMonthEdge = d === 1 || d === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
            const label = isMonthEdge ? format(date, "d/M") : format(date, "d");
            return { idx, label };
        });
    }, [days]);

    const allChecked = selectedIds.size === activeTracks.length;
    const someChecked = selectedIds.size > 0 && !allChecked;
    const currentRangeLabel = DATE_RANGE_OPTIONS.find((o) => o.days === dateRangeDays)?.label ?? "Custom";

    const handleDotClick = (point: { logIds: number[] }) => {
        if (!point.logIds.length) return;
        const log = logs.find((l) => l.id === point.logIds[0]);
        if (log) openLogTab(log);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border flex-shrink-0 flex-wrap">
                {/* Graph type */}
                <div className="flex items-center gap-1 rounded-md border border-border p-0.5 bg-muted/20">
                    <button
                        onClick={() => setGraphMode("frequency")}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors",
                            graphMode === "frequency" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Activity className="w-3 h-3" />
                        Frequency
                    </button>
                    <button
                        onClick={() => setGraphMode("count")}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors",
                            graphMode === "count" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <BarChart2 className="w-3 h-3" />
                        Count
                    </button>
                </div>

                {/* Tracks checklist */}
                <div ref={checklistRef} className="relative">
                    <button
                        onClick={() => setChecklistOpen((v) => !v)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                    >
                        Tracks ({selectedIds.size}/{activeTracks.length})
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {checklistOpen && (
                        <div className="absolute top-full left-0 mt-1 z-50 w-52 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
                            <button
                                onClick={() => {
                                    if (allChecked) setSelectedIds(new Set());
                                    else setSelectedIds(new Set(activeTracks.map((t) => t.id)));
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/30 border-b border-border"
                            >
                                <div className="w-3.5 h-3.5 flex items-center justify-center">
                                    {allChecked && <Check className="w-3 h-3" />}
                                    {someChecked && <div className="w-2 h-0.5 bg-current rounded" />}
                                </div>
                                All tracks
                            </button>
                            <div className="max-h-56 overflow-y-auto">
                                {tracksByUsage.map((track, i) => (
                                    <button
                                        key={track.id}
                                        onClick={() => toggleTrack(track.id)}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/30 transition-colors"
                                    >
                                        <Checkbox
                                            checked={selectedIds.has(track.id)}
                                            onCheckedChange={() => toggleTrack(track.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-3.5 h-3.5"
                                        />
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: resolveTrackColor(track.color, i) }} />
                                        <TrackIconDisplay value={track.emoji} trackColor={track.color} size="sm" />
                                        <span className="truncate text-foreground">{track.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Date range */}
                <div ref={dateRef} className="relative ml-auto">
                    <button
                        onClick={() => setDateDropOpen((v) => !v)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                    >
                        {currentRangeLabel}
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {dateDropOpen && (
                        <div className="absolute top-full right-0 mt-1 z-50 w-32 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
                            {DATE_RANGE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={() => { setDateRangeDays(opt.days); setDateDropOpen(false); }}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-muted/30 transition-colors",
                                        dateRangeDays === opt.days ? "text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {dateRangeDays === opt.days ? <Check className="w-3 h-3 flex-shrink-0" /> : <span className="w-3" />}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Graph */}
            <div className="flex-1 overflow-hidden p-4">
                {selectedTracks.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Select at least one track
                    </div>
                ) : graphMode === "count" ? (
                    <CountChart data={countData} selectedTracks={selectedTracks} activeTracks={tracksByUsage} />
                ) : (
                    <FrequencyChart
                        freqData={freqData}
                        xTicks={freqXTicks}
                        days={days}
                        onDotClick={handleDotClick}
                        logs={logs}
                    />
                )}
            </div>
        </div>
    );
}

// ── Dialog wrapper ──────────────────────────────────────────────────────────

interface TrackTimelineSheetProps {
    open: boolean;
    onClose: () => void;
}

export function TrackTimelineSheet({ open, onClose }: TrackTimelineSheetProps) {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
                <DialogHeader className="px-5 pt-4 pb-0 flex-shrink-0">
                    <DialogTitle className="text-sm font-semibold">Track Activity</DialogTitle>
                </DialogHeader>
                <TrackGraphContent />
            </DialogContent>
        </Dialog>
    );
}
