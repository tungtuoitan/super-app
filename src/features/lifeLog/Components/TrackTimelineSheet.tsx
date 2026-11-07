/**
 * TrackTimelineSheet / TrackGraphContent
 * Reusable graph content (used in both Dialog and Tab)
 * Graph modes: frequency (scatter) | count (bar)
 */

import { useMemo, useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared";
import { Checkbox } from "@/shared";
import { useLifeLogStore } from "../store/useLifeLog.store";
import { TrackIconDisplay } from "./TrackIconDisplay";
import { CountChart } from "./small/CountChart";
import { FrequencyChart } from "./small/FrequencyChart";
import { format, subDays, startOfDay, differenceInCalendarDays } from "date-fns";
import { BarChart2, Activity, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveTrackColor } from "./trackColors";
import type { LifeLogLog } from "@/features/lifeLog/types/lifeLog.types";

type GraphMode = "frequency" | "count";

type DateRangeOption = { label: string; days: number | null };
const DATE_RANGE_OPTIONS: DateRangeOption[] = [
    { label: "7 days",   days: 7   },
    { label: "14 days",  days: 14  },
    { label: "30 days",  days: 30  },
    { label: "90 days",  days: 90  },
    { label: "All time", days: null },
];

// ── Shared content ─────────────────────────────────────────────────────────

interface TrackGraphContentProps {
    onLogClick?: (log: LifeLogLog) => void;
}

export function TrackGraphContent({ onLogClick }: TrackGraphContentProps) {
    const { tracks, logs } = useLifeLogStore();

    const activeTracks = tracks.filter((t) => !t.deletedAt);

    const tracksByUsage = (() => {
        const usageMap = new Map<number, number>();
        for (const log of logs) {
            if (log.trackId && !log.deletedAt) usageMap.set(log.trackId, (usageMap.get(log.trackId) ?? 0) + 1);
        }
        return [...activeTracks].sort((a, b) => (usageMap.get(b.id) ?? 0) - (usageMap.get(a.id) ?? 0));
    })()

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

    const days = (() => {
        if (dateRangeDays === null) {
            const earliest = logs.reduce((min, l) => {
                if (l.deletedAt) return min;
                const d = new Date(l.createdAt).getTime();
                return d < min ? d : min;
            }, Date.now());
            return Math.max(differenceInCalendarDays(new Date(), new Date(earliest)) + 1, 1);
        }
        return dateRangeDays;
    })()

    const countData = Array.from({ length: days }, (_, i) => {
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
    })

    // freqData: points include logIds for click-through
    const freqData = (() => {
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
    })()

    const freqXTicks = (() => {
        const step = days <= 14 ? 1 : days <= 30 ? 3 : days <= 90 ? 7 : 14;
        return Array.from({ length: Math.ceil(days / step) }, (_, i) => {
            const idx = i * step;
            const date = subDays(new Date(), days - 1 - idx);
            const d = date.getDate();
            const isMonthEdge = d === 1 || d === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
            const label = isMonthEdge ? format(date, "d/M") : format(date, "d");
            return { idx, label };
        });
    })()

    const allChecked = selectedIds.size === activeTracks.length;
    const someChecked = selectedIds.size > 0 && !allChecked;
    const currentRangeLabel = DATE_RANGE_OPTIONS.find((o) => o.days === dateRangeDays)?.label ?? "Custom";

    const handleDotClick = (point: { logIds: number[] }) => {
        if (!onLogClick || !point.logIds.length) return;
        const log = logs.find((l) => l.id === point.logIds[0]);
        if (log) onLogClick(log);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-sa-border flex-shrink-0 flex-wrap">
                {/* Graph type */}
                <div className="flex items-center gap-0.5 rounded-lg border border-sa-border p-0.5">
                    <button
                        onClick={() => setGraphMode("frequency")}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 h-6 rounded-md text-[13px] transition-colors duration-100",
                            graphMode === "frequency" ? "bg-sa-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Activity className="w-3 h-3" />
                        Frequency
                    </button>
                    <button
                        onClick={() => setGraphMode("count")}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 h-6 rounded-md text-[13px] transition-colors duration-100",
                            graphMode === "count" ? "bg-sa-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground"
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
                        className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg border border-sa-border text-[13px] text-muted-foreground hover:text-foreground hover:bg-sa-hover transition-colors duration-100"
                    >
                        Tracks ({selectedIds.size}/{activeTracks.length})
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {checklistOpen && (
                        <div className="absolute top-full left-0 mt-1 z-50 w-52 rounded-lg border border-sa-border bg-popover sa-shadow-pop overflow-hidden">
                            <button
                                onClick={() => {
                                    if (allChecked) setSelectedIds(new Set());
                                    else setSelectedIds(new Set(activeTracks.map((t) => t.id)));
                                }}
                                className="w-full flex items-center gap-2 px-3 h-8 text-[13px] text-muted-foreground hover:bg-sa-hover-strong border-b border-sa-border"
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
                                        className="w-full flex items-center gap-2 px-3 h-8 text-[13px] hover:bg-sa-hover-strong transition-colors duration-100"
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
                        className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg border border-sa-border text-[13px] text-muted-foreground hover:text-foreground hover:bg-sa-hover transition-colors duration-100"
                    >
                        {currentRangeLabel}
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {dateDropOpen && (
                        <div className="absolute top-full right-0 mt-1 z-50 w-32 rounded-lg border border-sa-border bg-popover sa-shadow-pop overflow-hidden">
                            {DATE_RANGE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={() => { setDateRangeDays(opt.days); setDateDropOpen(false); }}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 h-8 text-[13px] text-left hover:bg-sa-hover-strong transition-colors duration-100",
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
                    <div className="h-full flex items-center justify-center text-muted-foreground text-[13px]">
                        Select at least one track
                    </div>
                ) : graphMode === "count" ? (
                    <CountChart data={countData} selectedTracks={selectedTracks} activeTracks={tracksByUsage} />
                ) : (
                    <FrequencyChart
                        freqData={freqData}
                        xTicks={freqXTicks}
                        days={days}
                        onDotClick={onLogClick ? handleDotClick : undefined}
                        logs={logs}
                    />
                )}
            </div>
        </div>
    );
}

// ── Dialog wrapper (kept for potential reuse) ──────────────────────────────

interface TrackTimelineSheetProps {
    open: boolean;
    onClose: () => void;
    onLogClick?: (log: LifeLogLog) => void;
}

export function TrackTimelineSheet({ open, onClose, onLogClick }: TrackTimelineSheetProps) {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
                <DialogHeader className="px-5 pt-4 pb-0 flex-shrink-0">
                    <DialogTitle className="text-sm font-medium">Track Activity</DialogTitle>
                </DialogHeader>
                <TrackGraphContent onLogClick={onLogClick} />
            </DialogContent>
        </Dialog>
    );
}
