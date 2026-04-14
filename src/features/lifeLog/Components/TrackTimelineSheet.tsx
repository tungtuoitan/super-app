/**
 * TrackTimelineSheet / TrackGraphContent
 * Reusable graph content (used in both Dialog and Tab)
 * Graph modes: frequency (scatter) | count (bar)
 */

import { useMemo, useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Checkbox } from "@/Components/ui/checkbox";
import { useLifeLogStore } from "../store/useLifeLog.store";
import { TrackIconDisplay } from "./TrackIconDisplay";
import {
    BarChart, Bar, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay, differenceInCalendarDays } from "date-fns";
import { BarChart2, Activity, ChevronDown, Check, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveTrackColor } from "./trackColors";
import type { LifeLogLog } from "@/types/lifeLog.types";

type GraphMode = "frequency" | "count";

type DateRangeOption = { label: string; days: number | null };
const DATE_RANGE_OPTIONS: DateRangeOption[] = [
    { label: "7 days",   days: 7   },
    { label: "14 days",  days: 14  },
    { label: "30 days",  days: 30  },
    { label: "90 days",  days: 90  },
    { label: "All time", days: null },
];

const ZOOM_STEPS = [7, 14, 30, 60, 90, 180, 365];

// ── Shared content ─────────────────────────────────────────────────────────

interface TrackGraphContentProps {
    onLogClick?: (log: LifeLogLog) => void;
}

export function TrackGraphContent({ onLogClick }: TrackGraphContentProps) {
    const { tracks, logs } = useLifeLogStore();

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

    // freqData: points include logIds for click-through
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
        if (!onLogClick || !point.logIds.length) return;
        const log = logs.find((l) => l.id === point.logIds[0]);
        if (log) onLogClick(log);
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
                    <DialogTitle className="text-sm font-semibold">Track Activity</DialogTitle>
                </DialogHeader>
                <TrackGraphContent onLogClick={onLogClick} />
            </DialogContent>
        </Dialog>
    );
}

// ── Count chart ────────────────────────────────────────────────────────────

interface CountChartProps {
    data: Record<string, string | number>[];
    selectedTracks: any[];
    activeTracks: any[];
}

function CountChart({ data, selectedTracks, activeTracks }: CountChartProps) {
    const interval = data.length <= 14 ? 0 : data.length <= 30 ? 2 : Math.floor(data.length / 10);
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.25} />
                <XAxis dataKey="dateLabel" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#4b5563" }} interval={interval} />
                <YAxis allowDecimals={false} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={24} />
                <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                    formatter={(value: number | undefined, _name: string | undefined, entry: any) => {
                        const trackId = Number(entry?.dataKey);
                        const track = activeTracks.find((t: any) => t.id === trackId);
                        return [value ?? 0, track?.name ?? entry?.dataKey];
                    }}
                />
                {selectedTracks.map((track: any) => (
                    <Bar
                        key={track.id}
                        dataKey={String(track.id)}
                        name={track.name}
                        fill={resolveTrackColor(track.color, activeTracks.indexOf(track))}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={28}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}

// ── Custom Y-axis tick with icon + name ────────────────────────────────────

function YAxisTrackTick(props: any) {
    const { x, y, payload, freqData } = props;
    const info = freqData[payload?.value];
    if (!info) return null;
    const track = info.track;
    const color = resolveTrackColor(track.color, info.trackIdx);
    const iconSize = 16;
    const gap = 4;
    const maxNameWidth = 56;
    const totalWidth = iconSize + gap + maxNameWidth;

    return (
        <g transform={`translate(${x - totalWidth - 4},${y - iconSize / 2})`}>
            {/* Colored square background for icon */}
            <rect x={0} y={0} width={iconSize} height={iconSize} rx={3} fill={color} />
            {/* Shell icon as simple path — white, centered */}
            <foreignObject x={0} y={0} width={iconSize} height={iconSize} style={{ overflow: "visible" }}>
                <div
                    style={{
                        width: iconSize, height: iconSize,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontSize: 10,
                    }}
                >
                    <TrackIconDisplaySvg color={color} size={iconSize} />
                </div>
            </foreignObject>
            {/* Track name */}
            <text
                x={iconSize + gap}
                y={iconSize / 2 + 1}
                dominantBaseline="middle"
                fill="#9ca3af"
                fontSize={10}
                style={{ maxWidth: maxNameWidth }}
            >
                {track.name.length > 9 ? track.name.slice(0, 8) + "…" : track.name}
            </text>
        </g>
    );
}

// Minimal inline SVG for Shell icon (lucide shell path)
function TrackIconDisplaySvg({ color, size }: { color: string; size: number }) {
    // lucide-shell path (simplified)
    return (
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 11a2 2 0 1 1-4 0 4 4 0 0 1 4-4" />
            <path d="M6 6a2 2 0 0 0-2 2v1a8 8 0 0 0 8 8 8 8 0 0 0 8-8v-2a2 2 0 0 0-2-2h-1a2 2 0 0 1-2-2 2 2 0 0 0-2-2H9a2 2 0 0 0-2 2A2 2 0 0 1 5 6H4" />
        </svg>
    );
}

interface FreqPoint { x: number; y: number; count: number; logIds: number[] }
interface FreqTrack { track: any; trackIdx: number; points: FreqPoint[] }

interface FrequencyChartProps {
    freqData: FreqTrack[];
    xTicks: { idx: number; label: string }[];
    days: number;
    onDotClick?: (point: FreqPoint) => void;
    logs: any[];
}

function FreqDot(props: any) {
    const { cx, cy, payload, fill, onDotClick } = props;
    if (cx == null || cy == null) return null;
    const visR = Math.min(2 + (payload?.count ?? 1), 6);
    return (
        <g style={onDotClick ? { cursor: "pointer" } : undefined} onClick={() => onDotClick?.(payload)}>
            <circle cx={cx} cy={cy} r={10} fill="transparent" />
            <circle cx={cx} cy={cy} r={visR} fill={fill} fillOpacity={0.9} />
        </g>
    );
}

function FrequencyChart({ freqData, xTicks, days, onDotClick, logs }: FrequencyChartProps) {
    const trackCount = freqData.length;
    const yTicks = freqData.map((_, i) => i);

    const [zoomDays, setZoomDays] = useState<number>(() => Math.min(days, 30));

    const zoomIn = () => {
        const cur = ZOOM_STEPS.indexOf(zoomDays);
        if (cur > 0) setZoomDays(ZOOM_STEPS[cur - 1]);
    };
    const zoomOut = () => {
        const cur = ZOOM_STEPS.indexOf(zoomDays);
        const next = cur === -1 ? 0 : cur + 1;
        if (next < ZOOM_STEPS.length) setZoomDays(ZOOM_STEPS[next]);
    };

    const windowEnd = days - 1;
    const windowStart = Math.max(0, windowEnd - zoomDays + 1);
    const visibleTicks = xTicks.filter((t) => t.idx >= windowStart && t.idx <= windowEnd);

    return (
        <div className="flex flex-col h-full gap-1">
            <div className="flex items-center justify-end gap-1 flex-shrink-0">
                <button onClick={zoomIn} disabled={zoomDays <= ZOOM_STEPS[0]} className="p-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 disabled:opacity-30 transition-colors" title="Zoom in">
                    <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-muted-foreground w-16 text-center">{zoomDays}d</span>
                <button onClick={zoomOut} disabled={zoomDays >= Math.min(days, ZOOM_STEPS[ZOOM_STEPS.length - 1])} className="p-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 disabled:opacity-30 transition-colors" title="Zoom out">
                    <ZoomOut className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                        <XAxis
                            type="number" dataKey="x"
                            domain={[windowStart, windowEnd]}
                            ticks={visibleTicks.map((t) => t.idx)}
                            tickFormatter={(v) => xTicks.find((t) => t.idx === v)?.label ?? ""}
                            tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#4b5563" }}
                        />
                        <YAxis
                            type="number" dataKey="y"
                            domain={[-0.5, trackCount - 0.5]} ticks={yTicks}
                            tick={(props) => <YAxisTrackTick {...props} freqData={freqData} />}
                            tickLine={false} axisLine={false} width={96}
                        />
                        <Tooltip
                            cursor={false}
                            contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                            formatter={(value: any, name: string | undefined, props: any) => {
                                if (name === "x") return null;
                                if (name === "count") return [props?.payload?.count, "times"];
                                return null;
                            }}
                            labelFormatter={() => ""}
                            content={<FreqTooltip freqData={freqData} days={days} logs={logs} />}
                        />
                        {freqData.map(({ track, trackIdx, points }) => {
                            const color = resolveTrackColor(track.color, trackIdx);
                            return (
                                <Scatter
                                    key={track.id}
                                    data={points}
                                    fill={color}
                                    shape={<FreqDot fill={color} onDotClick={onDotClick} />}
                                />
                            );
                        })}
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function FreqTooltip({ active, payload, freqData, days, logs }: any) {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p) return null;
    const trackInfo = freqData[p.y];
    const track = trackInfo?.track;
    const date = format(subDays(new Date(), days - 1 - p.x), "dd/MM/yyyy");

    // Collect logs for this dot (up to 3 shown)
    const dotLogs: any[] = (p.logIds ?? [])
        .map((id: number) => logs?.find((l: any) => l.id === id))
        .filter(Boolean);

    return (
        <div style={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, padding: "8px 10px", fontSize: 12, minWidth: 160, maxWidth: 240 }}>
            {/* Track header */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <TrackIconDisplay value={track?.emoji} trackColor={track?.color} size="sm" />
                <span style={{ fontWeight: 600, color: "hsl(var(--foreground))" }}>{track?.name}</span>
            </div>
            <div style={{ color: "#9ca3af", marginBottom: 4 }}>{date} · {p.count}×</div>
            {/* Log entries */}
            {dotLogs.slice(0, 3).map((log: any) => (
                <div key={log.id} style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: 4, marginTop: 4 }}>
                    {log.title && <div style={{ color: "hsl(var(--foreground))", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{log.title}</div>}
                    {log.description && <div style={{ color: "#9ca3af", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{log.description}</div>}
                    {(log.occurAt ?? log.createdAt) && (
                        <div style={{ color: "#6b7280", fontSize: 10, marginTop: 1 }}>{format(new Date(log.occurAt ?? log.createdAt), "HH:mm")}</div>
                    )}
                </div>
            ))}
            {dotLogs.length > 3 && <div style={{ color: "#6b7280", fontSize: 10, marginTop: 4 }}>+{dotLogs.length - 3} more</div>}
            {p.logIds?.length > 0 && <div style={{ color: "#9ca3af", fontSize: 10, marginTop: 4 }}>click to open</div>}
        </div>
    );
}
