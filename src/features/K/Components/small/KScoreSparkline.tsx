interface KScoreSparklineProps {
    scores: number[];
    slots?: number;
}

const barColor = (pct: number) =>
    pct >= 70 ? "#22c55e" : pct >= 40 ? "#eab308" : "#ef4444";

export function KScoreSparkline({ scores, slots: SLOTS = 7 }: KScoreSparklineProps) {
    const barW = 6;
    const gap  = 2;
    const H    = 36;
    const rx   = 2;
    const W    = SLOTS * (barW + gap) - gap;

    const filled: (number | null)[] = [
        ...Array(Math.max(0, SLOTS - scores.length)).fill(null),
        ...scores.slice(-SLOTS),
    ];

    return (
        <svg width={W} height={H} className="shrink-0 self-center" style={{ display: "block" }}>
            <line x1={0} y1={H} x2={W} y2={H} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />

            {filled.map((pct, i) => {
                const x = i * (barW + gap);
                if (pct === null) {
                    return <rect key={i} x={x} y={H - 3} width={barW} height={3} rx={rx} fill="currentColor" opacity={0.1} />;
                }
                const h = Math.max(3, Math.round((pct / 100) * H));
                const y = H - h;
                return (
                    <g key={i}>
                        <rect x={x} y={0} width={barW} height={H} rx={rx} fill="currentColor" opacity={0.06} />
                        <rect x={x} y={y} width={barW} height={h} rx={rx} fill={barColor(pct)} opacity={0.9} />
                        <title>{pct}%</title>
                    </g>
                );
            })}
        </svg>
    );
}
