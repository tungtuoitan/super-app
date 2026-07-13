import { useState } from "react";
import type { DailyLogHistoryPoint } from "../../types/dailyLog.types";
import { formatDayMonth } from "../../utils/dailyLog.utils";

interface Props {
    points: DailyLogHistoryPoint[];
    height?: number;
}

// Per CLAUDE.md "no re-export across helpers": copy smoothLinePath into each chart file.
function smoothLinePath(pts: Array<{ x: number; y: number }>, tension = 0.4): string {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(i + 2, pts.length - 1)];
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;
        d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
}

const W = 560;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };

export function DailyLogHistoryLineChart({ points, height = 220 }: Props) {
    const [hovered, setHovered] = useState<number | null>(null);
    if (points.length === 0) return null;

    const values = points.map((p) => Number(p.value)).filter((n) => Number.isFinite(n));
    if (values.length === 0) {
        return <div className="text-xs italic text-muted-foreground">No numeric values recorded.</div>;
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    const PLOT_W = W - PAD.left - PAD.right;
    const PLOT_H = height - PAD.top - PAD.bottom;
    const xStep = PLOT_W / Math.max(points.length - 1, 1);
    const toX = (i: number) => PAD.left + i * xStep;
    const toY = (v: number) => PAD.top + PLOT_H - ((v - min) / span) * PLOT_H;

    const pts = points.map((p, i) => ({ x: toX(i), y: toY(Number(p.value)) }));
    const yTicks = [min, min + span / 2, max];
    const labelInterval = points.length <= 7 ? 1 : points.length <= 30 ? 5 : Math.ceil(points.length / 6);

    return (
        <div className="relative" style={{ width: W, height }}>
            <svg width={W} height={height} className="block" onMouseLeave={() => setHovered(null)}>
                {yTicks.map((v) => (
                    <g key={v}>
                        <line x1={PAD.left} y1={toY(v)} x2={PAD.left + PLOT_W} y2={toY(v)}
                            stroke="currentColor" strokeOpacity={0.06} />
                        <text x={PAD.left - 6} y={toY(v) + 3} textAnchor="end"
                            fontSize={9} className="fill-muted-foreground/50">{v.toFixed(1)}</text>
                    </g>
                ))}

                {points.map((p, i) => {
                    if (i % labelInterval !== 0 && i !== points.length - 1) return null;
                    return (
                        <text key={i} x={toX(i)} y={height - 6} textAnchor="middle"
                            fontSize={9} className="fill-muted-foreground/50">
                            {formatDayMonth(p.logDate)}
                        </text>
                    );
                })}

                <path d={smoothLinePath(pts, 0.4)} fill="none" stroke="#0071e3" strokeWidth={1.5} strokeLinejoin="round" />

                {hovered != null && (
                    <line x1={toX(hovered)} y1={PAD.top} x2={toX(hovered)} y2={PAD.top + PLOT_H}
                        stroke="currentColor" strokeOpacity={0.12} strokeDasharray="3,3" />
                )}

                {points.map((_, i) => (
                    <rect key={i} x={toX(i) - xStep / 2} y={PAD.top}
                        width={xStep} height={PLOT_H} fill="transparent"
                        onMouseEnter={() => setHovered(i)} />
                ))}

                {hovered != null && (
                    <circle cx={toX(hovered)} cy={toY(Number(points[hovered].value))} r={4} fill="#0071e3" />
                )}
            </svg>

            {hovered != null && (
                <div className="absolute pointer-events-none text-[11px] rounded-md shadow-lg px-2.5 py-2 bg-popover border border-border"
                    style={{ left: Math.min(toX(hovered) + 8, W - 130), top: 4, minWidth: 100 }}>
                    <div className="text-[10px] text-muted-foreground mb-0.5">{formatDayMonth(points[hovered].logDate)}</div>
                    <div className="font-semibold text-[#0071e3]">{points[hovered].value}</div>
                </div>
            )}
        </div>
    );
}
