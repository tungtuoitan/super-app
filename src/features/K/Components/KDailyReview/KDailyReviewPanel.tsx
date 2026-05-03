import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Play, RefreshCw } from "lucide-react";
import { Button } from "@/shared";
import { KTestService } from "../../service/kTest.service";
import { KDailyReviewSession } from "./KDailyReviewSession";
import { sortQuestionsByFlowOrder } from "../../utils/kTestFlow.utils";
import type { KDailyQueueItem, KDailySessionQuestion } from "../../types/kTest.type";

interface KDailyReviewPanelProps {
    knowledgeId?: number;   // optional — omit for global view
    onComplete: () => void;
    onNavigateToTest?: (knowledgeId: number) => void;
}

type SessionState = {
    knowledgeId: number;
    title: string;
    questions: KDailySessionQuestion[];
} | null;

export function KDailyReviewPanel({ knowledgeId, onComplete, onNavigateToTest }: KDailyReviewPanelProps) {
    const [queue, setQueue]               = useState<KDailyQueueItem[]>([]);
    const [isLoading, setIsLoading]       = useState(true);
    const [session, setSession]           = useState<SessionState>(null);
    const [loadingKId, setLoadingKId]     = useState<number | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const qRes = knowledgeId
                ? await KTestService._getDailyQueue(knowledgeId)
                : await KTestService._getGlobalDailyQueue();
            setQueue(qRes.success && qRes.object ? qRes.object : []);
        } catch {
            setQueue([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [knowledgeId]);

    // ── Session handlers ───────────────────────────────────────────────────────

    const handleStartReview = async (item: KDailyQueueItem) => {
        setLoadingKId(item.knowledgeId);
        try {
            const res = await KTestService._getDailySession(item.knowledgeId);
            if (res.success && res.object && res.object.length > 0) {
                const sorted = await sortQuestionsByFlowOrder(res.object);
                setSession({ knowledgeId: item.knowledgeId, title: item.knowledgeName, questions: sorted });
            }
        } catch { /* silent */ }
        finally { setLoadingKId(null); }
    };

    const handleComplete = () => {
        setSession(null);
        loadData();
        onComplete();
    };

    // ── Session view ───────────────────────────────────────────────────────────

    if (session) {
        return (
            <KDailyReviewSession
                knowledgeId={session.knowledgeId}
                testTitle={session.title}
                questions={session.questions}
                onComplete={handleComplete}
                onBack={() => { setSession(null); loadData(); }}
            />
        );
    }

    // ── Loading ────────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // ── Main view ──────────────────────────────────────────────────────────────

    const items = queue.filter(q => q.dueCount + q.newCount > 0);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800/60 shrink-0">
                <CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" />
                <h1 className="text-sm font-semibold truncate">Daily Review</h1>
                <button onClick={loadData} className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-1">
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Card list */}
            <div className="flex-1 overflow-auto px-3 py-2.5">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                        <CalendarClock className="w-8 h-8 opacity-40" />
                        <p className="text-sm">All caught up!</p>
                        <p className="text-xs opacity-60 text-center px-4">No questions due for review</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 max-w-lg mx-auto">
                        {items.map(item => (
                            <div
                                key={item.knowledgeId}
                                className="group rounded-lg border border-border bg-card hover:border-zinc-600 p-2.5 transition-colors"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <h3
                                        className={`text-sm font-medium truncate flex-1 ${onNavigateToTest ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
                                        onClick={onNavigateToTest ? () => onNavigateToTest(item.knowledgeId) : undefined}
                                    >
                                        {item.knowledgeName}
                                    </h3>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1 h-6 text-[10px] shrink-0 px-2 opacity-60 group-hover:opacity-100 transition-opacity"
                                        disabled={loadingKId === item.knowledgeId}
                                        onClick={() => handleStartReview(item)}
                                    >
                                        {loadingKId === item.knowledgeId
                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                            : <Play className="w-3 h-3" />
                                        }
                                        {item.dueCount + item.newCount}
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground/60">
                                    {item.dueCount > 0 && <span className="text-orange-400/80">{item.dueCount} due</span>}
                                    {item.newCount > 0 && <span className="text-blue-400/80">{item.newCount} new</span>}
                                    <span className="ml-auto">{item.activeCount} Q</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
