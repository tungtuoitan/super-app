import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Play, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { KTestService } from "../../service/kTest.service";
import { KDailyReviewSession } from "./KDailyReviewSession";
import { useKStore } from "../../store/K.store";
import { ScoreSparkline } from "../small/ScoreSparkline";
import type { KTestSummary, KDailyQueueItem, KDailySessionQuestion } from "../../types/kTest.type";

interface KDailyReviewPanelProps {
    knowledgeId?: number;   // optional — omit for global view
    onComplete: () => void;
    onNavigateToTest?: (knowledgeId: number) => void;
}

/** Merged card model: test summary + daily queue counts */
interface DailyCardData {
    testId: number;
    knowledgeId: number;
    knowledgeName: string;
    title: string;
    status: string | null;
    scoreHistory: number[];
    lastPct: number | null;
    questionCount: number;
    activeCount: number;
    dueCount: number;
    newCount: number;
}

type SessionState = {
    knowledgeId: number;
    testId: number;
    testTitle: string;
    questions: KDailySessionQuestion[];
} | null;

const STATUS_ORDER: Record<string, number> = { learning: 0, mastered: 1, inactive: 2 };

export function KDailyReviewPanel({ knowledgeId, onComplete, onNavigateToTest }: KDailyReviewPanelProps) {
    const { setDailyReviewDueCount, allK } = useKStore();

    const [allTests, setAllTests]         = useState<KTestSummary[]>([]);
    const [queue, setQueue]               = useState<KDailyQueueItem[]>([]);
    const [isLoading, setIsLoading]       = useState(true);
    const [showAll, setShowAll]           = useState(false);
    const [session, setSession]           = useState<SessionState>(null);
    const [loadingTestId, setLoadingTestId] = useState<number | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const qRes = knowledgeId
                ? await KTestService._getDailyQueue(knowledgeId)
                : await KTestService._getGlobalDailyQueue();
            const items = qRes.success && qRes.object ? qRes.object : [];
            setQueue(items);
            if (!knowledgeId) {
                setDailyReviewDueCount(items.filter(q => q.dueCount + q.newCount > 0).length);
            }

            // Fetch tests (with scoreHistory) from all relevant knowledges
            const kIds = knowledgeId
                ? [knowledgeId]
                : allK.map(k => k.id);
            const testsArrays = await Promise.all(
                kIds.map(kid => KTestService._getTests(kid).catch(() => [] as KTestSummary[]))
            );
            setAllTests(testsArrays.flat());
        } catch {
            setQueue([]);
            setAllTests([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [knowledgeId]);

    // ── Merge tests + queue into cards ─────────────────────────────────────

    const cards: DailyCardData[] = useMemo(() => {
        const queueMap = new Map(queue.map(q => [q.testId, q]));
        const kNameMap = new Map(allK.map(k => [k.id, k.name]));

        // Start from allTests (has scoreHistory), enrich with queue counts
        const merged: DailyCardData[] = [];
        const seenIds = new Set<number>();

        for (const t of allTests) {
            seenIds.add(t.id);
            const q = queueMap.get(t.id);
            const kId = t.knowledgeId ?? knowledgeId ?? 0;
            merged.push({
                testId: t.id,
                knowledgeId: kId,
                knowledgeName: kNameMap.get(kId) ?? "",
                title: t.title,
                status: t.status,
                scoreHistory: t.scoreHistory,
                lastPct: t.lastPct,
                questionCount: t.questionCount,
                activeCount: q?.activeCount ?? t.activeCount,
                dueCount: q?.dueCount ?? 0,
                newCount: q?.newCount ?? 0,
            });
        }

        // Queue items not in tests (global mode — tests from other knowledges)
        for (const q of queue) {
            if (seenIds.has(q.testId)) continue;
            merged.push({
                testId: q.testId,
                knowledgeId: q.knowledgeId,
                knowledgeName: q.knowledgeName,
                title: q.title,
                status: q.status,
                scoreHistory: [],
                lastPct: null,
                questionCount: q.activeCount,
                activeCount: q.activeCount,
                dueCount: q.dueCount,
                newCount: q.newCount,
            });
        }

        // Sort: learning first, then mastered, then inactive
        merged.sort((a, b) => {
            const sa = STATUS_ORDER[a.status ?? "inactive"] ?? 2;
            const sb = STATUS_ORDER[b.status ?? "inactive"] ?? 2;
            if (sa !== sb) return sa - sb;
            // Within same status: items with due first
            const aDue = a.dueCount + a.newCount;
            const bDue = b.dueCount + b.newCount;
            if (aDue !== bDue) return bDue - aDue;
            return 0;
        });

        return merged;
    }, [allTests, queue, knowledgeId, allK]);

    const visibleCards = showAll ? cards : cards.filter(c => c.status === "learning" || c.status === "mastered");
    const dueTotal = cards.reduce((sum, c) => sum + c.dueCount + c.newCount, 0);
    const inactiveCount = cards.filter(c => c.status !== "learning" && c.status !== "mastered").length;

    // ── Session handlers ─────────────────────────────────────────────────────

    const handleStartReview = async (card: DailyCardData) => {
        setLoadingTestId(card.testId);
        try {
            const res = await KTestService._getDailySession(card.knowledgeId, card.testId);
            if (res.success && res.object && res.object.length > 0) {
                setSession({ knowledgeId: card.knowledgeId, testId: card.testId, testTitle: card.title, questions: res.object });
            }
        } catch { /* silent */ }
        finally { setLoadingTestId(null); }
    };

    const handleComplete = () => {
        setSession(null);
        loadData();
        onComplete();
    };

    const handleBack = () => {
        setSession(null);
        loadData();
    };

    // ── Session view ──────────────────────────────────────────────────────────

    if (session) {
        return (
            <KDailyReviewSession
                knowledgeId={session.knowledgeId}
                testId={session.testId}
                testTitle={session.testTitle}
                questions={session.questions}
                onComplete={handleComplete}
                onBack={handleBack}
            />
        );
    }

    // ── Loading ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // ── Main view ─────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/60 shrink-0">
                <CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" />
                <h1 className="text-sm font-semibold truncate">Daily</h1>
                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    {inactiveCount > 0 && (
                        <button
                            onClick={() => setShowAll(v => !v)}
                            className={`flex items-center gap-1 text-[10px] px-1.5 py-1 rounded transition-colors ${
                                showAll ? "text-muted-foreground bg-zinc-800" : "text-muted-foreground/50 hover:text-muted-foreground"
                            }`}
                            title={showAll ? "Hide inactive tests" : "Show all tests"}
                        >
                            {showAll ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {showAll ? "Active only" : `+${inactiveCount}`}
                        </button>
                    )}
                    <button onClick={loadData} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Card list */}
            <div className="flex-1 overflow-auto px-3 py-2.5">
                {visibleCards.length === 0 ? (
                    <EmptyState hasInactive={inactiveCount > 0} onShowAll={() => setShowAll(true)} />
                ) : (
                    <div className="flex flex-col gap-2 max-w-lg mx-auto">
                        {visibleCards.map(card => (
                            <DailyTestCard
                                key={card.testId}
                                card={card}
                                isLoading={loadingTestId === card.testId}
                                onStart={() => handleStartReview(card)}
                                onNavigate={onNavigateToTest ? () => onNavigateToTest(card.knowledgeId) : undefined}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── EmptyState ────────────────────────────────────────────────────────────

function EmptyState({ hasInactive, onShowAll }: { hasInactive: boolean; onShowAll: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <CalendarClock className="w-8 h-8 opacity-40" />
            <p className="text-sm">No tests in learning mode</p>
            <p className="text-xs opacity-60 text-center px-4">
                Set a test status to "Learning" to include it in daily review
            </p>
            {hasInactive && (
                <button onClick={onShowAll} className="text-[11px] text-blue-400 hover:text-blue-300 mt-1">
                    Show all tests
                </button>
            )}
        </div>
    );
}

// ── DailyTestCard ─────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; class: string }> = {
    learning: { label: "learning", class: "text-blue-400 bg-blue-900/30" },
    mastered: { label: "mastered", class: "text-purple-400 bg-purple-900/30" },
    inactive: { label: "inactive", class: "text-zinc-500 bg-zinc-800/50" },
};

function DailyTestCard({ card, isLoading, onStart, onNavigate }: {
    card: DailyCardData;
    isLoading: boolean;
    onStart: () => void;
    onNavigate?: () => void;
}) {
    const totalDue = card.dueCount + card.newCount;
    const cfg = statusConfig[card.status ?? "inactive"] ?? statusConfig.inactive;
    const isActive = card.status === "learning" || card.status === "mastered";

    return (
        <div className={`group rounded-lg border p-2.5 transition-colors ${
            isActive ? "border-border bg-card hover:border-zinc-600" : "border-zinc-800/40 bg-zinc-900/20 opacity-60 hover:opacity-80"
        }`}>
            {/* Row 1: title + status + review button */}
            <div className="flex items-center gap-2 min-w-0">
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <h3
                        className={`text-sm font-medium truncate ${onNavigate ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
                        onClick={onNavigate}
                    >
                        {card.title}
                    </h3>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${cfg.class}`}>
                        {cfg.label}
                    </span>
                </div>
                {totalDue > 0 && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-6 text-[10px] shrink-0 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isLoading}
                        onClick={onStart}
                    >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        {totalDue}
                    </Button>
                )}
            </div>

            {/* Row 2: knowledge name (global mode) */}
            {card.knowledgeName && (
                <p className="text-[10px] text-left text-muted-foreground/50 truncate mt-0.5">{card.knowledgeName}</p>
            )}

            {/* Row 2: sparkline + stats */}
            <div className="flex items-center gap-2.5 mt-1.5">
                {card.scoreHistory.length > 0 ? (
                    <ScoreSparkline scores={card.scoreHistory} slots={7} />
                ) : (
                    <div className="w-[56px] h-[18px]" /> /* placeholder to align */
                )}
                {card.lastPct != null && (
                    <span className={`text-[10px] font-medium ${
                        card.lastPct >= 70 ? "text-green-500" : card.lastPct >= 40 ? "text-yellow-500" : "text-red-500"
                    }`}>
                        {card.lastPct}%
                    </span>
                )}
                <div className="flex items-center gap-2 ml-auto text-[10px] text-muted-foreground/60">
                    {card.dueCount > 0 && <span className="text-orange-400/80">{card.dueCount} due</span>}
                    {card.newCount > 0 && <span className="text-blue-400/80">{card.newCount} new</span>}
                    <span>{card.activeCount} Q</span>
                </div>
            </div>
        </div>
    );
}
