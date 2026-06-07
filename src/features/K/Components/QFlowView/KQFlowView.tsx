import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, RotateCcw } from "lucide-react";
import { KQuizService } from "../../service/kQuiz.service";
import { KQFlowProvider } from "../../store/useKQFlow.store";
import { KQFlowCanvas } from "./KQFlowCanvas";
import { KScoreSparkline } from "../small/KScoreSparkline";
import type { KQuestion } from "../../types/kQuiz.type";
import { kEvents } from "../../utils/kEvents.utils";
import type { KFlowQuestionsChangedDetail } from "../../utils/kEvents.utils";
import { useKQFlowStats } from "../../hooks/qFlow/useKQFlowStats.helper";
import { useKQFlowSrsReset } from "../../hooks/qFlow/useKQFlowSrsReset.helper";

interface KQFlowViewProps {
    nodeId: number | null; // null = show orphan questions (node_id IS NULL)
}

export function KQFlowView({ nodeId }: KQFlowViewProps) {
    return (
        <KQFlowProvider>
            <KQFlowContent nodeId={nodeId} />
        </KQFlowProvider>
    );
}

function KQFlowContent({ nodeId }: KQFlowViewProps) {
    const [questions, setQuestions]       = useState<KQuestion[]>([]);
    const [loading, setLoading]           = useState(true);
    const [showDeleted, setShowDeleted]   = useState(false);

    useEffect(() => {
        setQuestions([]);
        setShowDeleted(false);
        setLoading(true);
    }, [nodeId]);

    const fetchQuestions = useCallback(async () => {
        const res = nodeId === null
            ? await KQuizService._getOrphanQuestions()
            : await KQuizService._getNodeQuestions(nodeId);
        if (res.success && res.object) {
            setQuestions(res.object.questions);
        }
    }, [nodeId]);

    const loadQuestions = useCallback(async () => {
        setLoading(true);
        try { await fetchQuestions(); } finally { setLoading(false); }
    }, [fetchQuestions]);

    // Initial load: show spinner while fetching questions
    useEffect(() => { loadQuestions(); }, [loadQuestions]);

    // EVENT-DRIVEN SILENT FETCH:
    // When a question operation completes (create, update, delete, restore),
    // the handler fires an event from the operation's context (usually in a
    // helper or dialog). This view listens for that event and silently
    // re-fetches the question list.
    //
    // WHY "SILENT" (no spinner):
    // - User already sees the change in the canvas (optimistic update)
    // - Spinner would appear to "undo" what user just did
    // - Backend fetch is just to sync state, not show new data
    // - The smart rebuild in useKQFlow.headless reuses node references
    //   if nothing visible changed, so no flicker
    //
    // HOW IT WORKS:
    // 1. Create/update/delete operation calls dispatchKFlowQuestionsChanged(nodeId)
    // 2. This listener catches that event for the current nodeId
    // 3. Calls fetchQuestions() WITHOUT setting loading=true
    // 4. setQuestions triggers a rebuild in useKQFlow.headless
    // 5. Smart rebuild compares new data with existing nodes
    // 6. Nodes are reused (no flash) unless actual values changed
    useEffect(() => {
        const handler = (e: CustomEvent<KFlowQuestionsChangedDetail>) => {
            if (e.detail.nodeId === nodeId) fetchQuestions();
        };
        window.addEventListener(kEvents.flowQuestionsChanged, handler as EventListener);
        return () => window.removeEventListener(kEvents.flowQuestionsChanged, handler as EventListener);
    }, [nodeId, fetchQuestions]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const {
        activeQuestions, reviewableQuestions,
        dueCount, newCount, draftCount,
        sparkScores,
    } = useKQFlowStats(questions);

    // ── SRS reset ─────────────────────────────────────────────────────────────
    const { resetConfirm, resetLoading, handleResetClick } = useKQFlowSrsReset(
        nodeId, activeQuestions, loadQuestions,
    );

    const deletedCount = questions.filter(q => !!q.deletedAt).length;
    const canvasNodeId = nodeId ?? 0;
    // Show reset button only when at least one active question has been reviewed
    const hasReviewHistory = reviewableQuestions.some(q => q.srsNextReviewAt !== null || q.scoreHistory.length > 0);

    return (
        <div className="flex flex-col h-full relative">
            {/* Toolbar */}
            <div className="flex items-center gap-1.5 px-3 h-11 border-b border-zinc-800/60 shrink-0">

                {nodeId === null && (
                    <span className="text-xs text-zinc-500 italic">Orphaned questions</span>
                )}

                <div className="ml-auto flex items-center gap-2">
                    {/* Sparkline + stats */}
                    {activeQuestions.length > 0 && (
                        <div className="flex items-center gap-2">
                            {sparkScores.length > 0 && (
                                <KScoreSparkline scores={sparkScores} slots={7} />
                            )}
                            <div className="flex items-center gap-1.5 text-[11px]">
                                {dueCount > 0 && <span className="text-orange-400/80 font-medium">{dueCount} due</span>}
                                {newCount  > 0 && <span className="text-blue-400/80 font-medium">{newCount} new</span>}
                                {draftCount > 0 && <span className="text-amber-600/70 font-medium">{draftCount} draft</span>}
                                <span className="text-zinc-500">{activeQuestions.length} Q</span>
                            </div>
                        </div>
                    )}

                    {/* Status toggle + Play button moved to KEditorPanel tab bar */}

                    {/* Reset SRS — first click arms confirm, second click executes */}
                    {/* {nodeId !== null && !isDraft && hasReviewHistory && (
                        <button
                            onClick={handleResetClick}
                            disabled={resetLoading}
                            title={resetConfirm ? "Click again to confirm reset" : "Reset all SRS history for this node"}
                            className={[
                                "h-7 px-2 flex items-center gap-1 text-xs rounded border transition-colors disabled:opacity-50",
                                resetConfirm
                                    ? "text-red-400 border-red-700/60 bg-red-950/30 hover:bg-red-950/50"
                                    : "text-zinc-600 border-zinc-800 hover:text-zinc-400 hover:border-zinc-600",
                            ].join(" ")}
                        >
                            {resetLoading
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <RotateCcw className="w-3 h-3" />
                            }
                            {resetConfirm && <span>Confirm?</span>}
                        </button>
                    )} */}

                    {/* Show-deleted toggle */}
                    {deletedCount > 0 && (
                        <button
                            onClick={() => setShowDeleted(v => !v)}
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
                <KQFlowCanvas
                    nodeId={canvasNodeId}
                    questions={questions}
                    showDeleted={showDeleted}
                    loading={loading}
                />
            </div>
        </div>
    );
}
