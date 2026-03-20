/**
 * FrequencyChart - Scatter chart showing when activities occurred
 */

import { useState } from "react";
import {
    ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ZoomIn, ZoomOut } from "lucide-react";
import { resolveTrackColor } from "@/utils/lifeLog.utils";
import { ZOOM_STEPS } from "@/utils/lifeLog.constants";
import { YAxisTrackTick } from "./YAxisTrackTick";
import { FreqTooltip } from "./FreqTooltip";
import type { FreqPoint, FreqTrack, LifeLogLog } from "@/types/lifeLog.types";

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

interface FrequencyChartProps {
    freqData: FreqTrack[];
    xTicks: { idx: number; label: string }[];
    days: number;
    onDotClick?: (point: FreqPoint) => void;
    logs: LifeLogLog[];
}

export function FrequencyChart({ freqData, xTicks, days, onDotClick, logs }: FrequencyChartProps) {
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
