import { useState } from "react";
import type { KQuestionStatusTimeline, KQuestionStatusTimelinePoint } from "../../types/kQuiz.type";

interface KProgressQuestionCountChartProps {
    data: KQuestionStatusTimeline;
    height?: number;
}

const W = 380;
const PAD = { top: 10, right: 8, bottom: 22, left: 30 };
const PLOT_W = W - PAD.left - PAD.right;

type SeriesKey = "master" | "learning" | "draft" | "deleted";
const SERIES: { key: SeriesKey; label: string; color: string; fillOpacity: number }[] = [
    { key: "master",   label: "Master",   color: "#30d158", fillOpacity: 0.06 },
    { key: "learning", label: "Learning", color: "#0071e3", fillOpacity: 0.05 },
    { key: "draft",    label: "Draft",    color: "#8e8e93", fillOpacity: 0.04 },
    { key: "deleted",  label: "Deleted",  color: "#ff453a", fillOpacity: 0.04 },
];

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

function pointValue(p: KQuestionStatusTimelinePoint, key: SeriesKey): number {
    return p[key];
}

export function KProgressQuestionCountChart({ data, height = 160 }: KProgressQuestionCountChartProps) {
    const [hovered, setHovered] = useState<number | null>(null);

    const PLOT_H = height - PAD.top - PAD.bottom;
    const days = data.days;
    if (days.length === 0) return null;

    const maxVal = Math.max(
        ...days.flatMap(d => SERIES.map(s => pointValue(d, s.key))),
        1,
    );

    const xStep = PLOT_W / Math.max(days.length - 1, 1);
    const toX = (i: number) => PAD.left + i * xStep;
    const toY = (v: number) => PAD.top + PLOT_H - (v / maxVal) * PLOT_H;
    const bottomY = PAD.top + PLOT_H;

    const seriesPts = (key: SeriesKey) =>
        days.map((d, i) => ({ x: toX(i), y: toY(pointValue(d, key)) }));

    const yTicks = [0, Math.round(maxVal / 2), maxVal];
    const labelInterval = days.length <= 7 ? 1 : days.length <= 30 ? 5 : days.length <= 60 ? 10 : Math.ceil(days.length / 6);

    return (
        <div className="relative" style={{ width: W, height }}>
            <svg width={W} height={height} className="block" onMouseLeave={() => setHovered(null)}>
                {yTicks.map(v => (
                    <g key={v}>
                        <line x1={PAD.left} y1={toY(v)} x2={PAD.left + PLOT_W} y2={toY(v)}
                            stroke="currentColor" strokeOpacity={0.06} />
                        <text x={PAD.left - 4} y={toY(v) + 3} textAnchor="end"
                            fontSize={9} className="fill-muted-foreground/50">{v}</text>
                    </g>
                ))}

                {days.map((d, i) => {
                    if (i % labelInterval !== 0 && i !== days.length - 1) return null;
                    return (
                        <text key={i} x={toX(i)} y={height - 4} textAnchor="middle"
                            fontSize={9} className="fill-muted-foreground/50">
                            {d.date.slice(5)}
                        </text>
                    );
                })}

                {SERIES.map(s => (
                    <path key={s.key}
                        d={smoothAreaPath(seriesPts(s.key), 0.4, bottomY)}
                        fill={s.color} fillOpacity={s.fillOpacity} />
                ))}

                {hovered != null && (
                    <line x1={toX(hovered)} y1={PAD.top} x2={toX(hovered)} y2={bottomY}
                        stroke="currentColor" strokeOpacity={0.12} strokeDasharray="3,3" />
                )}

                {days.map((_, i) => (
                    <rect key={i} x={toX(i) - xStep / 2} y={PAD.top}
                        width={xStep} height={PLOT_H} fill="transparent"
                        onMouseEnter={() => setHovered(i)} />
                ))}

                {SERIES.map(s => (
                    <path key={s.key}
                        d={smoothLinePath(seriesPts(s.key), 0.4)}
                        fill="none" stroke={s.color} strokeWidth={1.5} strokeLinejoin="round" />
                ))}

                {hovered != null && SERIES.map(s => (
                    <circle key={s.key}
                        cx={toX(hovered)} cy={toY(pointValue(days[hovered], s.key))}
                        r={4} fill={s.color} />
                ))}

                {hovered == null && (() => {
                    const last = days.length - 1;
                    return SERIES.map(s => (
                        <circle key={s.key}
                            cx={toX(last)} cy={toY(pointValue(days[last], s.key))}
                            r={3.5} fill={s.color} />
                    ));
                })()}
            </svg>

            {hovered != null && (
                <div className="absolute z-10 pointer-events-none text-[11px] rounded-[8px] shadow-lg"
                    style={{
                        left: Math.min(toX(hovered) + 8, W - 130),
                        top: 0,
                        background: "var(--popover)",
                        border: "1px solid rgba(0,0,0,0.08)",
                        padding: "10px",
                        minWidth: 120,
                    }}>
                    <div className="text-muted-foreground mb-1.5 text-[10px]">{days[hovered].date.slice(5)}</div>
                    {SERIES.map(s => (
                        <div key={s.key} className="flex items-center gap-1.5 leading-5">
                            <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: s.color }} />
                            <span className="text-foreground/70">{s.label}:</span>
                            <span className="font-semibold ml-auto pl-2" style={{ color: s.color }}>
                                {pointValue(days[hovered], s.key)}
                            </span>
                        </div>
                    ))}
                    {(() => {
                        const sum = SERIES.reduce((s, x) => s + pointValue(days[hovered], x.key), 0);
                        const total = days[hovered].total;
                        const mismatch = sum !== total;
                        return (
                            <div className="flex items-center gap-1.5 leading-5 mt-1 pt-1 border-t border-foreground/10">
                                <span className="text-foreground/70">Total:</span>
                                <span className="font-semibold ml-auto pl-2"
                                      style={{ color: mismatch ? "#ff453a" : undefined }}
                                      title={mismatch ? `Sum of buckets = ${sum} (mismatch)` : undefined}>
                                    {total}{mismatch && ` ≠ ${sum}`}
                                </span>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
