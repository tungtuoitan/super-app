import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Play } from "lucide-react";
import { KTestService } from "../../service/kTest.service";
import { KTestFlowProvider } from "../../store/useKTestFlow.store";
import { KQuestionFlowCanvas } from "./KQuestionFlowCanvas";
import { KDailyReviewSession } from "../KDailyReview/KDailyReviewSession";
import { ScoreSparkline } from "../small/ScoreSparkline";
import { sortQuestionsByFlowOrder } from "../../utils/kTestFlow.utils";
import { useKStore } from "../../store/K.store";
import type { KQuestion } from "../../types/kTest.type";
import type { KDailySessionQuestion } from "../../types/kTest.type";
import { kEvents } from "../../utils/kEvents.utils";
import type { KFlowQuestionsChangedDetail } from "../../utils/kEvents.utils";

interface KQFlowViewProps {
    nodeId: number | null; // null = show orphan questions (node_id IS NULL)
}

export function KQFlowView({ nodeId }: KQFlowViewProps) {
    return (
        <KTestFlowProvider>
            <KQFlowContent nodeId={nodeId} />
        </KTestFlowProvider>
    );
}

function KQFlowContent({ nodeId }: KQFlowViewProps) {
    const [questions, setQuestions] = useState<KQuestion[]>([]);
    // Start as true — initial mount will fetch questions, so we want canvas hidden until done
    const [loading, setLoading] = useState(true);
    const [showDeleted, setShowDeleted] = useState(false);
    const [reviewSession, setReviewSession] = useState<KDailySessionQuestion[] | null>(null);
    const [sessionLoading, setSessionLoading] = useState(false);

    const { currentK } = useKStore();
    const node = nodeId !== null ? currentK?.flatData.find(n => n.id === nodeId) : null;
    const nodeStatus = node?.statusCode ?? null;
    const isLearning = nodeStatus === "learning";

    useEffect(() => {
        console.log(`[kflow-view] nodeId→${nodeId} → clear questions, loading=true`);
        setQuestions([]);
        setShowDeleted(false);
        setReviewSession(null);
        setLoading(true); // mark transition start so canvas overlay covers it
    }, [nodeId]);

    const loadQuestions = useCallback(async () => {
        const t0 = performance.now();
        console.log(`[kflow-view] loadQuestions start (nodeId=${nodeId})`);
        setLoading(true);
        try {
            const res = nodeId === null
                ? await KTestService._getOrphanQuestions()
                : await KTestService._getQuestions(nodeId);
            if (res.success && res.object) {
                console.log(`[kflow-view] loadQuestions done in ${(performance.now() - t0).toFixed(0)}ms — got ${res.object.questions.length} questions`);
                setQuestions(res.object.questions);
            }
        } finally {
            setLoading(false);
        }
    }, [nodeId]);

    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    // Reload when a question operation fires for this node (or for orphans when nodeId=null)
    useEffect(() => {
        const handler = (e: CustomEvent<KFlowQuestionsChangedDetail>) => {
            if (e.detail.knowledgeId === nodeId) loadQuestions();
        };
        window.addEventListener(kEvents.flowQuestionsChanged, handler as EventListener);
        return () => window.removeEventListener(kEvents.flowQuestionsChanged, handler as EventListener);
    }, [nodeId, loadQuestions]);

    // ── Stats ─────────────────────────────────────────────────────────────────

    const now = new Date();
    const activeQuestions = questions.filter(q => q.isActive && !q.deletedAt);
    const dueCount = activeQuestions.filter(
        q => q.srsNextReviewAt && new Date(q.srsNextReviewAt) <= now
    ).length;
    const newCount = activeQuestions.filter(q => !q.srsNextReviewAt).length;
    const totalDue = dueCount + newCount;

    // Aggregate sparkline: for each of the last 7 slots, average score across all questions
    // scoreHistory values are 0–5; multiply ×20 to get 0–100 for ScoreSparkline
    const sparkScores = useMemo(() => {
        const qs = activeQuestions.filter(q => q.scoreHistory.length > 0);
        if (qs.length === 0) return [];
        const SLOTS = 7;
        const result: number[] = [];
        for (let slot = 0; slot < SLOTS; slot++) {
            const values: number[] = [];
            for (const q of qs) {
                const idx = q.scoreHistory.length - SLOTS + slot;
                if (idx >= 0) values.push(q.scoreHistory[idx]);
            }
            if (values.length > 0) {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                result.push(Math.round(avg * 20));
            }
        }
        return result;
    }, [questions]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Play handler ──────────────────────────────────────────────────────────

    const handleStartReview = async () => {
        if (nodeId === null) return;
        setSessionLoading(true);
        try {
            const res = await KTestService._getDailySession(nodeId);
            if (res.success && res.object && res.object.length > 0) {
                const sorted = await sortQuestionsByFlowOrder(res.object);
                setReviewSession(sorted);
            }
        } catch { /* silent */ }
        finally { setSessionLoading(false); }
    };

    const deletedCount = questions.filter((q) => !!q.deletedAt).length;

    // Use 0 as canvas key for orphans — just needs a stable numeric ID for position storage
    const canvasNodeId = nodeId ?? 0;

    return (
        <div className="flex flex-col h-full relative">
            {/* Toolbar */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-800/60 shrink-0">
                {nodeId === null && (
                    <span className="text-xs text-zinc-500 italic">Orphaned questions</span>
                )}
                <div className="ml-auto flex items-center gap-2">
                    {/* Sparkline + stats — shown when there are active questions */}
                    {activeQuestions.length > 0 && (
                        <div className="flex items-center gap-2">
                            {sparkScores.length > 0 && (
                                <ScoreSparkline scores={sparkScores} slots={7} />
                            )}
                            <div className="flex items-center gap-1.5 text-[11px]">
                                {dueCount > 0 && (
                                    <span className="text-orange-400/80 font-medium">{dueCount} due</span>
                                )}
                                {newCount > 0 && (
                                    <span className="text-blue-400/80 font-medium">{newCount} new</span>
                                )}
                                <span className="text-zinc-500">{activeQuestions.length} Q</span>
                            </div>
                        </div>
                    )}

                    {/* Play button — only for "learning" nodes with due questions */}
                    {nodeId !== null && isLearning && totalDue > 0 && (
                        <button
                            onClick={handleStartReview}
                            disabled={sessionLoading}
                            title={`Review ${totalDue} question${totalDue !== 1 ? "s" : ""}`}
                            className="h-7 px-2.5 flex items-center gap-1.5 text-xs font-medium rounded border border-blue-700/60 bg-blue-900/20 text-blue-300 hover:bg-blue-900/40 hover:border-blue-600 transition-colors disabled:opacity-50"
                        >
                            {sessionLoading
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Play className="w-3 h-3 fill-current" />
                            }
                            {totalDue}
                        </button>
                    )}

                    {/* Show-deleted toggle */}
                    {deletedCount > 0 && (
                        <button
                            onClick={() => setShowDeleted((v) => !v)}
                            title={showDeleted ? "Hide deleted questions" : `Show ${deletedCount} deleted question${deletedCount !== 1 ? "s" : ""}`}
                            className={`h-7 px-2 flex items-center gap-1 text-xs rounded border transition-colors ${
                                showDeleted
                                    ? "text-red-400 border-red-800/60 bg-red-950/20"
                                    : "text-zinc-600 border-zinc-800 hover:text-zinc-400 hover:border-zinc-600"
                            }`}
                        >
                            {showDeleted ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{deletedCount}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Flow canvas */}
            <div className="flex-1 min-h-0 relative">
                <KQuestionFlowCanvas
                    knowledgeId={canvasNodeId}
                    questions={questions}
                    showDeleted={showDeleted}
                    loading={loading}
                />
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                    </div>
                )}
            </div>

            {/* Review session overlay */}
            {reviewSession && (
                <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
                    <KDailyReviewSession
                        knowledgeId={nodeId!}
                        testTitle={node?.name ?? ""}
                        questions={reviewSession}
                        onComplete={() => { setReviewSession(null); loadQuestions(); }}
                        onBack={() => setReviewSession(null)}
                    />
                </div>
            )}
        </div>
    );
}
