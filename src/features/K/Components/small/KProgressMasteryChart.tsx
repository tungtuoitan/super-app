import { useState } from "react";
import type { KRetentionGraph, KQuestion } from "../../types/kTest.type";

interface KProgressMasteryChartProps {
    data: KRetentionGraph;
    questions: KQuestion[];
    height?: number;
}

const W = 380;
const PAD = { top: 10, right: 8, bottom: 22, left: 24 };
const PLOT_W = W - PAD.left - PAD.right;

const SERIES = [
    { key: "mastered" as const, label: "Mastered", color: "#30d158", fillOpacity: 0.05 },
    { key: "learning" as const, label: "Learning",  color: "#ff9f0a", fillOpacity: 0.04 },
    { key: "inactive" as const, label: "Inactive",  color: "#8e8e93", fillOpacity: 0.03 },
];

interface DayPoint { mastered: number; learning: number; inactive: number; }

function buildNodeMasteryData(data: KRetentionGraph, questions: KQuestion[]): DayPoint[] {
    const qToNode = new Map<number, number | null>();
    questions.forEach(q => qToNode.set(q.id, q.nodeId));

    return data.days.map(day => {
        const nodeRetentions = new Map<number, number[]>();
        day.retentions.forEach((ret, i) => {
            const qId = data.questions[i]?.id;
            if (qId == null) return;
            const nodeId = qToNode.get(qId);
            if (nodeId == null) return;
            const arr = nodeRetentions.get(nodeId) ?? [];
            arr.push(ret);
            nodeRetentions.set(nodeId, arr);
        });

        let mastered = 0, learning = 0, inactive = 0;
        nodeRetentions.forEach(rets => {
            const avg = rets.reduce((s, r) => s + r, 0) / rets.length;
            if (avg >= 80)    mastered++;
            else if (avg > 0) learning++;
            else              inactive++;
        });
        return { mastered, learning, inactive };
    });
}

// Catmull-Rom → cubic bezier (tension ≈ Chart.js tension:0.4)
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

function smoothAreaPath(pts: Array<{ x: number; y: number }>, tension: number, bottomY: number): string {
    const line = smoothLinePath(pts, tension);
    if (!line || pts.length === 0) return "";
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${line} L${last.x.toFixed(1)},${bottomY.toFixed(1)} L${first.x.toFixed(1)},${bottomY.toFixed(1)} Z`;
}

export function KProgressMasteryChart({ data, questions, height = 160 }: KProgressMasteryChartProps) {
    const [hovered, setHovered] = useState<number | null>(null);

    const PLOT_H = height - PAD.top - PAD.bottom;
    const days = data.days;
    if (days.length === 0) return null;

    const pts = buildNodeMasteryData(data, questions);
    const maxVal = Math.max(...pts.flatMap(p => [p.mastered, p.learning, p.inactive]), 1);

    const xStep = PLOT_W / Math.max(days.length - 1, 1);
    const toX   = (i: number) => PAD.left + i * xStep;
    const toY   = (v: number) => PAD.top + PLOT_H - (v / maxVal) * PLOT_H;
    const bottomY = PAD.top + PLOT_H;

    const seriesPts = (key: keyof DayPoint) =>
        pts.map((p, i) => ({ x: toX(i), y: toY(p[key]) }));

    const yTicks = [0, Math.round(maxVal / 2), maxVal];
    const labelInterval = days.length <= 7 ? 1 : 2;

    return (
        <div className="relative" style={{ width: W, height }}>
            <svg width={W} height={height} className="block" onMouseLeave={() => setHovered(null)}>
                {/* Grid lines + Y labels */}
                {yTicks.map(v => (
                    <g key={v}>
                        <line x1={PAD.left} y1={toY(v)} x2={PAD.left + PLOT_W} y2={toY(v)}
                            stroke="currentColor" strokeOpacity={0.06} />
                        <text x={PAD.left - 4} y={toY(v) + 3} textAnchor="end"
                            fontSize={9} className="fill-muted-foreground/50">{v}</text>
                    </g>
                ))}

                {/* X axis labels */}
                {days.map((d, i) => {
                    if (i % labelInterval !== 0 && i !== days.length - 1) return null;
                    return (
                        <text key={i} x={toX(i)} y={height - 4} textAnchor="middle"
                            fontSize={9} className="fill-muted-foreground/50">
                            {d.date.slice(5)}
                        </text>
                    );
                })}

                {/* Area fills (smooth) */}
                {SERIES.map(s => (
                    <path key={s.key}
                        d={smoothAreaPath(seriesPts(s.key), 0.4, bottomY)}
                        fill={s.color} fillOpacity={s.fillOpacity} />
                ))}

                {/* Hover crosshair */}
                {hovered != null && (
                    <line x1={toX(hovered)} y1={PAD.top} x2={toX(hovered)} y2={bottomY}
                        stroke="currentColor" strokeOpacity={0.12} strokeDasharray="3,3" />
                )}

                {/* Hover capture rects */}
                {days.map((_, i) => (
                    <rect key={i} x={toX(i) - xStep / 2} y={PAD.top}
                        width={xStep} height={PLOT_H} fill="transparent"
                        onMouseEnter={() => setHovered(i)} />
                ))}

                {/* Lines (smooth, drawn above fills) */}
                {SERIES.map(s => (
                    <path key={s.key}
                        d={smoothLinePath(seriesPts(s.key), 0.4)}
                        fill="none" stroke={s.color} strokeWidth={1.5} strokeLinejoin="round" />
                ))}

                {/* Dots — only on hover (pointHoverRadius: 4) */}
                {hovered != null && SERIES.map(s => (
                    <circle key={s.key}
                        cx={toX(hovered)} cy={toY(pts[hovered][s.key])}
                        r={4} fill={s.color} />
                ))}
            </svg>

            {/* Tooltip — styled like demo: white bg + border */}
            {hovered != null && (
                <div className="absolute z-10 pointer-events-none text-[11px] rounded-[8px] shadow-lg"
                    style={{
                        left: Math.min(toX(hovered) + 8, W - 115),
                        top: 0,
                        background: "var(--popover)",
                        border: "1px solid rgba(0,0,0,0.08)",
                        padding: "10px",
                        minWidth: 100,
                    }}>
                    <div className="text-muted-foreground mb-1.5 text-[10px]">{days[hovered].date.slice(5)}</div>
                    {SERIES.map(s => (
                        <div key={s.key} className="flex items-center gap-1.5 leading-5">
                            <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: s.color }} />
                            <span className="text-foreground/70">{s.label}:</span>
                            <span className="font-semibold ml-auto pl-2" style={{ color: s.color }}>{pts[hovered][s.key]}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
