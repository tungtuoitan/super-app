import { parseInstant } from "@/shared";

interface KScoreBarProps {
    /** Last ≤10 scores, each 0–5, oldest→newest */
    scores: number[];
    /** ISO date string for next SRS review */
    srsNextReviewAt?: string | null;
    /** Current retention 0–100% */
    retention?: number;
}

const SLOTS = 10;
const DOT_SIZE = 4;
const GAP = 2;
const H = 10;
const W = SLOTS * (DOT_SIZE + GAP) - GAP;

const dotColor = (point: number) =>
    point >= 4 ? "hsl(var(--sa-good))" : point >= 2 ? "hsl(var(--sa-accent-amber))" : "hsl(var(--sa-danger))";

function formatNextReview(iso: string): string {
    const diff = (parseInstant(iso)?.getTime() ?? Date.now()) - Date.now();
    if (diff <= 0) return "due";

    if (diff < 3_600_000) {
        const m = Math.round(diff / 60_000);
        return `${m}m`;
    }
    if (diff < 86_400_000) {
        const h = Math.round(diff / 3_600_000);
        return `${h}h`;
    }
    const d = diff / 86_400_000;
    if (d < 10) return `${Math.round(d * 10) / 10}d`;
    return `${Math.round(d)}d`;
}

const retentionColor = (r: number) =>
    r >= 80 ? "hsl(var(--sa-good))" : r >= 50 ? "hsl(var(--sa-accent-amber))" : r >= 20 ? "hsl(var(--muted-foreground))" : "hsl(var(--sa-danger))";

export function KScoreBar({ scores, srsNextReviewAt, retention }: KScoreBarProps) {
    if (scores.length === 0 && !srsNextReviewAt && (retention == null || retention === 0)) return null;

    const filled: (number | null)[] = [
        ...Array(Math.max(0, SLOTS - scores.length)).fill(null),
        ...scores.slice(-SLOTS),
    ];

    const isDue = srsNextReviewAt
        ? (parseInstant(srsNextReviewAt)?.getTime() ?? Infinity) <= Date.now()
        : false;

    return (
        <div className="flex items-center gap-1.5">
            {scores.length > 0 && (
                <svg width={W} height={H} className="shrink-0" style={{ display: "block" }}>
                    {filled.map((point, i) => {
                        const x = i * (DOT_SIZE + GAP);
                        const cy = H / 2;
                        if (point === null) {
                            return (
                                <rect key={i} x={x} y={cy - 1} width={DOT_SIZE} height={2} rx={1}
                                    fill="currentColor" opacity={0.1} />
                            );
                        }
                        const h = Math.max(2, Math.round((point / 5) * H));
                        return (
                            <rect key={i} x={x} y={H - h} width={DOT_SIZE} height={h} rx={1}
                                fill={dotColor(point)} opacity={0.85} />
                        );
                    })}
                </svg>
            )}
            {srsNextReviewAt && (
                <span className={`font-mono text-[10px] leading-none whitespace-nowrap ${isDue ? "text-sa-amber-ink" : "text-muted-foreground"}`}>
                    {formatNextReview(srsNextReviewAt)}
                </span>
            )}
            {retention != null && retention > 0 && (
                <span className="font-mono text-[10px] leading-none whitespace-nowrap font-medium" style={{ color: retentionColor(retention) }}>
                    {Math.round(retention)}%
                </span>
            )}
        </div>
    );
}
