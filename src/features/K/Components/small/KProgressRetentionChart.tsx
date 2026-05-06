import { useState } from "react";
import type { KRetentionGraph } from "../../types/kQuiz.type";

interface KProgressRetentionChartProps {
    data: KRetentionGraph;
    height?: number;
}

const W = 380;
const PAD = { top: 10, right: 8, bottom: 22, left: 30 };
const PLOT_W = W - PAD.left - PAD.right;

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

export function KProgressRetentionChart({ data, height = 160 }: KProgressRetentionChartProps) {
    const [hovered, setHovered] = useState<number | null>(null);
    const PLOT_H = height - PAD.top - PAD.bottom;

    const days = data.days;
    if (days.length === 0) return null;

    const xStep  = PLOT_W / Math.max(days.length - 1, 1);
    const toX    = (i: number) => PAD.left + i * xStep;
    const toY    = (v: number) => PAD.top + PLOT_H - ((v - 50) / 50) * PLOT_H;
    const bottomY = PAD.top + PLOT_H;

    const pts = days.map((d, i) => ({ x: toX(i), y: toY(d.average) }));
    const linePath = smoothLinePath(pts, 0.4);
    const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${bottomY.toFixed(1)} L${pts[0].x.toFixed(1)},${bottomY.toFixed(1)} Z`;

    const showDay = hovered ?? days.length - 1;
    const labelInterval = days.length <= 7 ? 1 : 2;

    return (
        <div className="relative" style={{ width: W, height }}>
            <svg width={W} height={height} className="block" onMouseLeave={() => setHovered(null)}>
                {[50, 62, 75, 87, 100].map(v => (
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

                <path d={areaPath} fill="#30d158" fillOpacity={0.06} />

                {days.map((_, i) => (
                    <rect key={i} x={toX(i) - xStep / 2} y={PAD.top}
                        width={xStep} height={PLOT_H} fill="transparent"
                        onMouseEnter={() => setHovered(i)} />
                ))}

                {hovered != null && (
                    <line x1={toX(hovered)} y1={PAD.top} x2={toX(hovered)} y2={bottomY}
                        stroke="currentColor" strokeOpacity={0.12} strokeDasharray="3,3" />
                )}

                <path d={linePath} fill="none" stroke="#30d158" strokeWidth={1.5} strokeLinejoin="round" />

                {/* Dot — only on hover */}
                {hovered != null && (
                    <circle cx={toX(hovered)} cy={toY(days[hovered].average)} r={4} fill="#30d158" />
                )}
                {/* Always show dot at last point when not hovering */}
                {hovered == null && (
                    <circle cx={toX(showDay)} cy={toY(days[showDay].average)} r={3.5} fill="#30d158" />
                )}
            </svg>

            {hovered != null && (
                <div className="absolute z-10 pointer-events-none text-[11px] rounded-[8px] shadow-lg"
                    style={{
                        left: Math.min(toX(hovered) + 8, W - 90),
                        top: 0,
                        background: "var(--popover)",
                        border: "1px solid rgba(0,0,0,0.08)",
                        padding: "10px",
                    }}>
                    <div className="text-muted-foreground mb-1 text-[10px]">{days[hovered].date.slice(5)}</div>
                    <div className="font-semibold" style={{ color: "#30d158" }}>
                        {days[hovered].average}%
                    </div>
                </div>
            )}
        </div>
    );
}
