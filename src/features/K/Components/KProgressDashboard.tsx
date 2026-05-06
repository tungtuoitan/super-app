import { useEffect, useState } from "react";
import { Brain, BookOpen, CalendarClock, TrendingUp } from "lucide-react";
import { KQuizService } from "../service/kQuiz.service";
import { KService } from "../service/k.service";
import type { KRetentionSummary, KRetentionGraph, KDailyQueueItem, KQuestion } from "../types/kQuiz.type";
import type { KItemV2 } from "../types/kV2.type";
import { KProgressRetentionChart } from "./small/KProgressRetentionChart";
import { KProgressMasteryChart } from "./small/KProgressMasteryChart";

const C = { high: "#30d158", mid: "#ff9f0a", low: "#8e8e93", blue: "#0071e3", orange: "#ff6b35" };

type RetLevel = "high" | "mid" | "low";

function nodeLevel(avgRet: number): RetLevel {
    return avgRet >= 80 ? "high" : avgRet >= 50 ? "mid" : "low";
}

const RET_COLOR: Record<RetLevel, string> = { high: C.high, mid: C.mid, low: C.low };
const RET_LABEL: Record<RetLevel, string> = { high: "High", mid: "Medium", low: "Low" };
const RET_PILL: Record<RetLevel, string> = {
    high: "bg-[rgba(48,209,88,0.12)]  text-[#1a7a32] dark:text-[#52e57a]",
    mid:  "bg-[rgba(255,159,10,0.12)] text-[#9a5e00] dark:text-[#ffb340]",
    low:  "bg-[rgba(142,142,147,0.12)] text-[#636366]",
};

function Pill({ cls, text }: { cls: string; text: string }) {
    return <span className={`inline-flex items-center text-[11px] font-medium px-[9px] py-[3px] rounded-full tracking-[-0.01em] ${cls}`}>{text}</span>;
}

function NodeRetentionDonut({ high, mid, low }: { high: number; mid: number; low: number }) {
    const R = 50, CX = 65, stroke = 14, circ = 2 * Math.PI * R;
    const total   = high + mid + low;
    const highLen = total > 0 ? (high / total) * circ : 0;
    const midLen  = total > 0 ? (mid  / total) * circ : 0;
    const lowLen  = total > 0 ? (low  / total) * circ : 0;
    const highDeg = (high / Math.max(total, 1)) * 360;
    const midDeg  = (mid  / Math.max(total, 1)) * 360;
    return (
        <div className="relative w-[130px] h-[130px]">
            <svg width={130} height={130} viewBox="0 0 130 130">
                <circle cx={CX} cy={CX} r={R} fill="none" stroke="currentColor" strokeWidth={stroke} strokeOpacity={0.08} />
                {highLen > 0 && (
                    <circle cx={CX} cy={CX} r={R} fill="none" stroke={C.high} strokeWidth={stroke}
                        strokeDasharray={`${highLen} ${circ}`}
                        style={{ transform: "rotate(-90deg)", transformOrigin: `${CX}px ${CX}px` }} />
                )}
                {midLen > 0 && (
                    <circle cx={CX} cy={CX} r={R} fill="none" stroke={C.mid} strokeWidth={stroke}
                        strokeDasharray={`${midLen} ${circ}`}
                        style={{ transform: `rotate(${-90 + highDeg}deg)`, transformOrigin: `${CX}px ${CX}px` }} />
                )}
                {lowLen > 0 && (
                    <circle cx={CX} cy={CX} r={R} fill="none" stroke={C.low} strokeWidth={stroke}
                        strokeDasharray={`${lowLen} ${circ}`}
                        style={{ transform: `rotate(${-90 + highDeg + midDeg}deg)`, transformOrigin: `${CX}px ${CX}px` }} />
                )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                {total > 0
                    ? <>
                        <span className="text-[22px] font-semibold tracking-[-0.03em] leading-none">{high}/{total}</span>
                        <span className="text-[11px] text-muted-foreground mt-[2px]">high ret.</span>
                      </>
                    : <span className="text-[11px] text-muted-foreground">no data</span>
                }
            </div>
        </div>
    );
}


interface DashboardData {
    questions: KQuestion[];
    nodes: KItemV2[];
    retention: KRetentionSummary | null;
    retentionGraph: KRetentionGraph | null;
    dailyQueue: KDailyQueueItem[];
}

const CARD = "bg-card rounded-[18px] shadow-[0_2px_20px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden";
const CARD_LBL = "text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em]";

interface KProgressDashboardProps { knowledgeId: number; }

export function KProgressDashboard({ knowledgeId }: KProgressDashboardProps) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.allSettled([
            KQuizService._getQuestions(knowledgeId),
            KQuizService._getRetention(knowledgeId),
            KQuizService._getRetentionGraph(knowledgeId, 14),
            KQuizService._getDailyQueue(knowledgeId),
            KService._getWorkspaceTreeV2("", knowledgeId),
        ]).then(([qRes, retRes, graphRes, queueRes, treeRes]) => {
            const rawQs = qRes.status === "fulfilled" && qRes.value.success
                ? (qRes.value.object?.questions ?? []) : [];
            const nodes = treeRes.status === "fulfilled" && treeRes.value.success
                ? (treeRes.value.object?.flatData ?? []) : [];
            setData({
                questions: rawQs.filter(q => !q.deletedAt),
                nodes: nodes.filter(n => !n.deletedAt && n.statusCode !== "draft"),
                retention: retRes.status === "fulfilled" ? retRes.value : null,
                retentionGraph: graphRes.status === "fulfilled" ? graphRes.value : null,
                dailyQueue: queueRes.status === "fulfilled" && queueRes.value.success
                    ? (queueRes.value.object ?? []) : [],
            });
            setLoading(false);
        });
    }, [knowledgeId]);

    if (loading || !data) {
        return <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Loading…</div>;
    }

    const { questions, nodes, retention, retentionGraph, dailyQueue } = data;

    // Active node ids — nodes that are not deleted and not draft
    const activeNodeIds = new Set(nodes.map(n => n.id));

    // Helper: question belongs to a real, active node (excludes orphans & deleted/draft nodes)
    const isActiveNodeQ = (q: KQuestion) =>
        q.nodeId != null && q.nodeId !== 0 && activeNodeIds.has(q.nodeId);

    // Questions bucketed by status — orphans (nodeId null/0) and deleted nodes excluded
    const learningQs = questions.filter(q => q.statusCode === "learning" && isActiveNodeQ(q));
    const draftQs    = questions.filter(q => q.statusCode === "draft"    && isActiveNodeQ(q));

    const dueToday = dailyQueue.reduce((s, q) => s + q.dueCount, 0);
    const newToday = dailyQueue.reduce((s, q) => s + q.newCount, 0);

    // ── Node-level retention groups ─────────────────────────────────────────────
    const qByNode = new Map<number, KQuestion[]>();
    learningQs.forEach(q => {
        const arr = qByNode.get(q.nodeId!) ?? [];
        arr.push(q);
        qByNode.set(q.nodeId!, arr);
    });

    const nodeRetentionGroups = nodes
        .map(n => {
            const qs = qByNode.get(n.id) ?? [];
            const avgRet = qs.length > 0
                ? Math.round(qs.reduce((s, q) => s + q.retention, 0) / qs.length)
                : 0;
            const level = nodeLevel(avgRet);
            return { nodeId: n.id, nodeName: n.name, qs, avgRet, level };
        })
        .filter(g => g.qs.length > 0)
        .sort((a, b) => b.avgRet - a.avgRet);

    const totalNodes = nodeRetentionGroups.length;

    // Retention-level counts (for donut — pure retention, no SRS concept)
    const highNodes   = nodeRetentionGroups.filter(g => g.level === "high").length;
    const mediumNodes = nodeRetentionGroups.filter(g => g.level === "mid").length;
    const lowNodes    = nodeRetentionGroups.filter(g => g.level === "low").length;

    // ── Streak ──────────────────────────────────────────────────────────────────
    const reviewMap = new Map<string, number>();
    retentionGraph?.days.forEach(d => reviewMap.set(d.date, d.average));
    const today = new Date();
    const streakDays = Array.from({ length: 14 }, (_, idx) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (13 - idx));
        const key = d.toISOString().slice(0, 10);
        const avg = reviewMap.get(key);
        const level: 0 | 1 | 2 | 3 = avg == null ? 0 : avg >= 80 ? 3 : avg >= 65 ? 2 : 1;
        return { key, level, isToday: idx === 13 };
    });
    let streak = 0;
    for (let i = streakDays.length - 1; i >= 0; i--) {
        if (streakDays[i].level > 0) streak++;
        else break;
    }

    // ── Stat cards ──────────────────────────────────────────────────────────────
    const avgRetention = retention?.average != null ? `${retention.average}%` : "—";
    const STATS = [
        {
            lbl: "Active Questions", val: learningQs.length,
            pill: `across ${totalNodes} nodes`,
            pillCls: "bg-[rgba(48,209,88,0.12)] text-[#1a7a32] dark:text-[#52e57a]",
            iconBg: "rgba(48,209,88,0.12)", stroke: C.high,
            icon: <Brain className="w-4 h-4" />,
        },
        {
            lbl: "Avg Retention", val: avgRetention,
            pill: `${highNodes} high · ${mediumNodes} mid · ${lowNodes} low`,
            pillCls: "bg-[rgba(48,209,88,0.12)] text-[#1a7a32] dark:text-[#52e57a]",
            iconBg: "rgba(48,209,88,0.12)", stroke: C.high,
            icon: <TrendingUp className="w-4 h-4" />,
        },
        {
            lbl: "Due Today", val: dueToday,
            pill: `${newToday} new cards`,
            pillCls: "bg-[rgba(255,107,53,0.12)] text-[#a83800] dark:text-[#ff8f6b]",
            iconBg: "rgba(255,159,10,0.12)", stroke: C.mid,
            icon: <CalendarClock className="w-4 h-4" />,
        },
        {
            lbl: "Draft Questions", val: draftQs.length,
            pill: "excluded from review",
            pillCls: "bg-[rgba(142,142,147,0.12)] text-[#636366]",
            iconBg: "rgba(142,142,147,0.12)", stroke: C.low,
            icon: <BookOpen className="w-4 h-4" />,
        },
    ];

    return (
        <div className="p-6 space-y-3 overflow-auto h-full" style={{ maxWidth: 940, margin: "0 auto" }}>

            {/* Stat grid */}
            <div className="grid grid-cols-4 gap-3">
                {STATS.map(s => (
                    <div key={s.lbl} className={`${CARD} p-5 flex flex-col gap-3`}>
                        <div className="flex justify-between items-start">
                            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                                style={{ background: s.iconBg, color: s.stroke }}>
                                {s.icon}
                            </div>
                        </div>
                        <div className="text-left">
                            <div className="text-[12px] text-muted-foreground mb-[3px]">{s.lbl}</div>
                            <div className="text-[28px] font-semibold tracking-[-0.03em] leading-none">{s.val}</div>
                        </div>
                        <div className="text-left">
                            <Pill cls={s.pillCls} text={s.pill} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Review streak */}
            <div className={`${CARD} px-4 py-2.5 flex items-center gap-3`}>
                <div className={`${CARD_LBL} shrink-0`}>
                    Review streak
                    {streak > 0 && <span className="ml-2 text-[11px] font-normal text-muted-foreground">🔥 {streak}-day</span>}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="grid gap-[5px]" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
                        {streakDays.map(({ key, level, isToday }) => {
                            const bg = level === 3 ? "#30d158"
                                : level === 2 ? "rgba(48,209,88,0.5)"
                                : level === 1 ? "rgba(48,209,88,0.2)"
                                : undefined;
                            return (
                                <div key={key} title={isToday ? "Today" : key}
                                    className={`rounded-[5px] cursor-default transition-transform duration-150 hover:scale-[1.15]${!bg ? " bg-muted" : ""}`}
                                    style={{ aspectRatio: "1", background: bg, outline: isToday ? "1.5px solid #0071e3" : undefined }} />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-2 gap-3">
                <div className={`${CARD} p-5`}>
                    <div className="flex items-center mb-4">
                        <span className={CARD_LBL}>Avg retention</span>
                        <div className="ml-auto flex items-center gap-1.5">
                            <span className="w-[7px] h-[7px] rounded-[2px]" style={{ background: C.high }} />
                            <span className="text-[11px] text-muted-foreground">Retention</span>
                        </div>
                    </div>
                    {retentionGraph && retentionGraph.days.length > 0
                        ? <div className="overflow-x-auto"><KProgressRetentionChart data={retentionGraph} height={160} /></div>
                        : <div className="flex items-center justify-center h-[160px] text-[11px] text-muted-foreground text-center px-4">
                            Complete a review session to see your retention trend.
                          </div>
                    }
                </div>
                <div className={`${CARD} p-5`}>
                    <div className="flex items-center mb-[14px]">
                        <span className={CARD_LBL}>Memory strength over time</span>
                        <div className="ml-auto flex items-center gap-[14px]">
                            {[{ c: C.high, l: "Strong" }, { c: C.mid, l: "Learning" }, { c: C.low, l: "Not started" }].map(({ c, l }) => (
                                <div key={l} className="flex items-center gap-1.5">
                                    <span className="w-[7px] h-[7px] rounded-[2px]" style={{ background: c }} />
                                    <span className="text-[11px] text-muted-foreground">{l}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {retentionGraph && retentionGraph.days.length > 0
                        ? <div className="overflow-x-auto">
                            <KProgressMasteryChart data={retentionGraph} height={160} />
                          </div>
                        : <div className="flex items-center justify-center h-[160px] text-[11px] text-muted-foreground text-center px-4">
                            Complete a review session to see your mastery trend.
                          </div>
                    }
                </div>
            </div>

            {/* Retention per node */}
            <div className={`${CARD} p-6`}>
                <div className={`${CARD_LBL} mb-4`}>Retention per node</div>
                <div className="grid gap-6 items-start" style={{ gridTemplateColumns: "160px 1fr" }}>
                    <div>
                        {/* Donut: retention level breakdown (High/Medium/Low) */}
                        <NodeRetentionDonut high={highNodes} mid={mediumNodes} low={lowNodes} />
                        <div className="mt-[14px] flex flex-col gap-[5px]">
                            <div className="flex items-center gap-1.5">
                                <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: C.high }} />
                                <span className="text-[11px] text-muted-foreground">High retention</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: C.mid }} />
                                <span className="text-[11px] text-muted-foreground">Medium retention</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: C.low }} />
                                <span className="text-[11px] text-muted-foreground">Low retention</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {nodeRetentionGroups.map(({ nodeId, nodeName, qs, avgRet, level }) => (
                            <div key={nodeId}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[13px] font-medium truncate max-w-[55%]">{nodeName}</span>
                                    <div className="flex items-center gap-[10px] shrink-0">
                                        <span className="text-[11px] text-muted-foreground">{qs.length} q</span>
                                        <Pill cls={RET_PILL[level]} text={RET_LABEL[level]} />
                                        <span className="text-[12px] font-semibold w-9 text-right" style={{ color: RET_COLOR[level] }}>
                                            {avgRet}%
                                        </span>
                                    </div>
                                </div>
                                <div className="h-[3px] rounded-full bg-muted overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${avgRet}%`, background: RET_COLOR[level] }} />
                                </div>
                            </div>
                        ))}
                        {nodeRetentionGroups.length === 0 && (
                            <div className="text-[11px] text-muted-foreground py-6 text-center">No active questions yet.</div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
