import { useEffect, useRef, useState } from "react";
import { KTestService } from "../../service/kTest.service";
import type { KRetentionSummary, KRetentionGraph } from "../../types/kTest.type";

interface KRetentionBadgeProps {
    knowledgeId: number;
}

const retentionColor = (r: number) =>
    r >= 80 ? "#22c55e" : r >= 50 ? "#eab308" : r >= 20 ? "#f97316" : "#ef4444";

export function KRetentionBadge({ knowledgeId }: KRetentionBadgeProps) {
    const [summary, setSummary] = useState<KRetentionSummary | null>(null);
    const [graph, setGraph] = useState<KRetentionGraph | null>(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        KTestService._getRetention(knowledgeId).then(setSummary).catch(() => {});
    }, [knowledgeId]);

    const handleOpen = () => {
        if (open) { setOpen(false); return; }
        setOpen(true);
        if (!graph) {
            setLoading(true);
            KTestService._getRetentionGraph(knowledgeId, 14)
                .then(setGraph)
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    };

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    if (!summary || summary.totalQuestions === 0) return null;

    const avg = summary.average;
    const color = retentionColor(avg);

    return (
        <div ref={ref} className="relative flex items-center">
            <button
                onClick={handleOpen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-muted/50 transition-colors"
                title={`Retention: ${avg}%`}
            >
                <svg width={20} height={20} className="shrink-0">
                    <circle cx={10} cy={10} r={8} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={2.5} />
                    <circle
                        cx={10} cy={10} r={8} fill="none"
                        stroke={color} strokeWidth={2.5}
                        strokeDasharray={`${(avg / 100) * 50.27} 50.27`}
                        strokeLinecap="round"
                        transform="rotate(-90 10 10)"
                    />
                </svg>
                <span className="text-xs font-medium tabular-nums" style={{ color }}>
                    {Math.round(avg)}%
                </span>
            </button>

            {open && (
                <div className="absolute top-full right-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-4"
                    style={{ width: 420 }}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-zinc-400">Retention — last 14 days</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color }}>
                            {avg}%
                        </span>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center h-40 text-zinc-600 text-xs">Loading…</div>
                    ) : graph && graph.days.length > 0 ? (
                        <RetentionGraph data={graph} />
                    ) : (
                        <div className="flex items-center justify-center h-40 text-zinc-600 text-xs">No data</div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Graph ────────────────────────────────────────────────────────────────────

const GRAPH_W = 388;
const GRAPH_H = 180;
const PAD = { top: 12, right: 12, bottom: 24, left: 32 };
const PLOT_W = GRAPH_W - PAD.left - PAD.right;
const PLOT_H = GRAPH_H - PAD.top - PAD.bottom;

const DOT_COLORS = [
    "#6366f1", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6",
    "#06b6d4", "#f43f5e", "#22c55e", "#eab308", "#a855f7",
];

function RetentionGraph({ data }: { data: KRetentionGraph }) {
    const [hoveredDay, setHoveredDay] = useState<number | null>(null);

    const days = data.days;
    const qCount = data.questions.length;
    if (days.length === 0 || qCount === 0) return null;

    const xStep = PLOT_W / Math.max(days.length - 1, 1);

    const toX = (i: number) => PAD.left + i * xStep;
    const toY = (r: number) => PAD.top + PLOT_H - (r / 100) * PLOT_H;

    // Average line path
    const avgPath = days.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d.average).toFixed(1)}`).join(" ");

    // Per-question dots (only show for hovered day or last day)
    const showDay = hoveredDay ?? days.length - 1;
    const showDayData = days[showDay];

    // X-axis labels
    const labelInterval = days.length <= 7 ? 1 : days.length <= 14 ? 2 : 3;

    return (
        <div className="relative">
            <svg
                width={GRAPH_W}
                height={GRAPH_H}
                className="block"
                onMouseLeave={() => setHoveredDay(null)}
            >
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(v => (
                    <g key={v}>
                        <line
                            x1={PAD.left} y1={toY(v)} x2={PAD.left + PLOT_W} y2={toY(v)}
                            stroke="currentColor" strokeOpacity={0.06}
                        />
                        <text x={PAD.left - 4} y={toY(v) + 3} textAnchor="end" className="fill-zinc-600" fontSize={9}>
                            {v}
                        </text>
                    </g>
                ))}

                {/* X-axis date labels */}
                {days.map((d, i) => {
                    if (i % labelInterval !== 0 && i !== days.length - 1) return null;
                    const label = d.date.slice(5); // MM-DD
                    return (
                        <text key={i} x={toX(i)} y={GRAPH_H - 4} textAnchor="middle" className="fill-zinc-600" fontSize={9}>
                            {label}
                        </text>
                    );
                })}

                {/* Hover zones */}
                {days.map((_, i) => (
                    <rect
                        key={i}
                        x={toX(i) - xStep / 2}
                        y={PAD.top}
                        width={xStep}
                        height={PLOT_H}
                        fill="transparent"
                        onMouseEnter={() => setHoveredDay(i)}
                    />
                ))}

                {/* Hover vertical line */}
                {hoveredDay != null && (
                    <line
                        x1={toX(hoveredDay)} y1={PAD.top} x2={toX(hoveredDay)} y2={PAD.top + PLOT_H}
                        stroke="currentColor" strokeOpacity={0.15} strokeDasharray="2,2"
                    />
                )}

                {/* Per-question dots for active day */}
                {showDayData.retentions.map((r, qi) => {
                    if (r === 0) return null;
                    return (
                        <circle
                            key={qi}
                            cx={toX(showDay)}
                            cy={toY(r)}
                            r={2.5}
                            fill={DOT_COLORS[qi % DOT_COLORS.length]}
                            opacity={0.5}
                        />
                    );
                })}

                {/* Average line */}
                <path d={avgPath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />

                {/* Average dots */}
                {days.map((d, i) => (
                    <circle
                        key={i}
                        cx={toX(i)}
                        cy={toY(d.average)}
                        r={hoveredDay === i ? 4 : 2.5}
                        fill="#3b82f6"
                    />
                ))}
            </svg>

            {/* Tooltip */}
            {hoveredDay != null && (
                <div
                    className="absolute z-10 bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 shadow-lg pointer-events-none"
                    style={{
                        left: Math.min(toX(hoveredDay), GRAPH_W - 120),
                        top: 0,
                    }}
                >
                    <div className="text-[10px] text-zinc-400 mb-0.5">{days[hoveredDay].date}</div>
                    <div className="text-xs font-medium" style={{ color: retentionColor(days[hoveredDay].average) }}>
                        Avg: {days[hoveredDay].average}%
                    </div>
                </div>
            )}
        </div>
    );
}
