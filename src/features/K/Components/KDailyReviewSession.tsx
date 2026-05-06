import { useState, useRef, useEffect } from "react";
import { ArrowLeft, PenLine } from "lucide-react";
import { Button } from "@/shared";
import { KQuizService } from "../service/kQuiz.service";
import { cn } from "@/lib/utils";
import type { KDailySessionQuestion, KDailyAnswerItem } from "../types/kQuiz.type";

interface KDailyReviewSessionProps {
    knowledgeId: number;
    quizTitle: string;
    questions: KDailySessionQuestion[];
    onComplete: () => void;
    onBack: () => void;
    isQuickQuiz?: boolean;
}

function fmtInterval(seconds: number): string {
    if (seconds < 3600)           return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400)          return `${Math.round(seconds / 3600)}h`;
    if (seconds < 86400 * 30)     return `${Math.round(seconds / 86400)}d`;
    if (seconds < 86400 * 365)    return `${Math.round(seconds / (86400 * 30))}mo`;
    return `${Math.round(seconds / (86400 * 365))}y`;
}

// right=5 (nhớ), left=0 (quên), top=3 (ổn), bottom=null (cancel)
function getScoreFromDelta(dx: number, dy: number): number | null {
    const angle = Math.atan2(-dy, dx) * (180 / Math.PI);
    const abs = Math.abs(angle);
    if (abs < 45) return 5;
    if (abs > 135) return 0;
    if (angle > 0) return 3;
    return null; // dragging down = cancel
}


const SCORE_BUTTONS = [
    { score: 1, label: "Again",  btnClass: "border-red-600/50 text-red-400 hover:bg-red-600/20" },
    { score: 2, label: "Hard",   btnClass: "border-orange-500/40 text-orange-400 hover:bg-orange-500/20" },
    { score: 3, label: "Okay",   btnClass: "border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/20" },
    { score: 4, label: "Good",   btnClass: "border-green-400/40 text-green-400 hover:bg-green-500/20" },
    { score: 5, label: "Easy",   btnClass: "border-green-500/40 text-green-400 hover:bg-green-600/20" },
] as const;

const SCORE_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: "Again",  color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30" },
    2: { label: "Hard",   color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
    3: { label: "Okay",   color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
    4: { label: "Good",   color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30" },
    5: { label: "Easy",   color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30" },
};

export function KDailyReviewSession({ knowledgeId, quizTitle, questions, onComplete, onBack, isQuickQuiz }: KDailyReviewSessionProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timings, setTimings]           = useState<Record<number, number>>({});
    const [isSubmitted, setIsSubmitted]   = useState(false);
    const [selfScores, setSelfScores]     = useState<Record<number, number>>({});
    const draftedIdsRef = useRef<Set<number>>(new Set());
    const [showResult, setShowResult]     = useState(false);
    const [isDragScoring, setIsDragScoring] = useState(false);
    const [hoveredScore, setHoveredScore]   = useState<number | null>(null);

    const questionStartRef  = useRef<number>(Date.now());
    const timersRef         = useRef<ReturnType<typeof setTimeout>[]>([]);
    const dragStateRef      = useRef<{ origin: { x: number; y: number }; active: boolean } | null>(null);
    const advanceWithScoreRef = useRef<(score: number) => void>(() => {});
    const showResultRef       = useRef(false);

    const totalQuestions  = questions.length;
    const currentQuestion = questions[currentIndex];
    const progress        = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;

    useEffect(() => { questionStartRef.current = Date.now(); }, [currentIndex]);
    useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

    showResultRef.current = showResult;

    const submitInBackground = (scoresSnap: Record<number, number>, timingsSnap: Record<number, number>) => {
        const dailyAnswers: KDailyAnswerItem[] = questions
            .filter(q => !draftedIdsRef.current.has(q.id))
            .map(q => ({
                questionId: q.id,
                answerText: null,
                responseTimeMs: timingsSnap[q.id] ?? null,
                selfScore: scoresSnap[q.id] ?? null,
            }));
        KQuizService._submitDailyAnswers(knowledgeId, { answers: dailyAnswers })
            .catch(() => { /* silent */ });
    }

    const advanceWithScore = (score: number) => {
        if (isSubmitted) return;
        const qId = currentQuestion?.id;
        const elapsed = Date.now() - questionStartRef.current;
        const newTimings = qId !== undefined ? { ...timings, [qId]: (timings[qId] ?? 0) + elapsed } : timings;
        const newScores  = qId !== undefined ? { ...selfScores, [qId]: score } : selfScores;
        if (qId !== undefined) { setTimings(newTimings); setSelfScores(newScores); }
        if (currentIndex >= totalQuestions - 1) {
            setIsSubmitted(true);
            if (!isQuickQuiz) submitInBackground(newScores, newTimings);
            return;
        }
        setShowResult(false);
        setCurrentIndex(i => i + 1);
    }
    advanceWithScoreRef.current = advanceWithScore;

    // Mark current question as draft, clear its review history, then skip it
    const handleMarkDraft = () => {
        if (isSubmitted) return;
        const qId = currentQuestion?.id;
        if (qId === undefined) return;
        draftedIdsRef.current = new Set(draftedIdsRef.current).add(qId);
        KQuizService._markQuestionDraft(knowledgeId, qId).catch(() => {});
        if (currentIndex >= totalQuestions - 1) {
            setIsSubmitted(true);
            if (!isQuickQuiz) submitInBackground(selfScores, timings);
            return;
        }
        setShowResult(false);
        setCurrentIndex(i => i + 1);
    };

    // Drag-to-score — only active after answer is revealed
    const handleDragStart = (e: React.PointerEvent) => {
        if (!showResultRef.current) return;
        e.preventDefault();
        const origin = { x: e.clientX, y: e.clientY };
        dragStateRef.current = { origin, active: false };

        const onMove = (ev: PointerEvent) => {
            if (!dragStateRef.current) return;
            const dx = ev.clientX - origin.x;
            const dy = ev.clientY - origin.y;
            if (Math.sqrt(dx * dx + dy * dy) > 20) {
                dragStateRef.current.active = true;
                setIsDragScoring(true);
                setHoveredScore(getScoreFromDelta(dx, dy));
            }
        };

        const cleanup = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("pointercancel", onCancel);
        };

        const onUp = (ev: PointerEvent) => {
            cleanup();
            if (!dragStateRef.current) return;
            const dx = ev.clientX - origin.x;
            const dy = ev.clientY - origin.y;
            const wasActive = dragStateRef.current.active;
            dragStateRef.current = null;
            setIsDragScoring(false);
            setHoveredScore(null);
            if (!wasActive || Math.sqrt(dx * dx + dy * dy) <= 40) return;
            const score = getScoreFromDelta(dx, dy);
            if (score !== null) advanceWithScoreRef.current(score);
        };

        const onCancel = () => {
            cleanup();
            dragStateRef.current = null;
            setIsDragScoring(false);
            setHoveredScore(null);
        };

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        document.addEventListener("pointercancel", onCancel);
    }

    // ── Summary screen ────────────────────────────────────────────────────────

    if (isSubmitted) {
        const scoredQuestions = questions.filter(q => !draftedIdsRef.current.has(q.id));
        const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        scoredQuestions.forEach(q => {
            const s = selfScores[q.id];
            if (s !== undefined && s in stats) {
                stats[s as keyof typeof stats]++;
            }
        });

        return (
            <div className="flex flex-col h-full overflow-auto">
                <div className="flex flex-col items-center gap-5 px-3 py-6 max-w-lg mx-auto w-full">
                    <div className="text-center">
                        <h2 className="text-base font-semibold">{quizTitle}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">{scoredQuestions.length} question{scoredQuestions.length !== 1 ? "s" : ""}</p>
                    </div>

                    <div className="flex gap-2.5 w-full flex-wrap">
                        {SCORE_BUTTONS.map(btn => (
                            <div key={btn.score} className={cn("flex-1 min-w-fit text-center rounded-lg border py-3", SCORE_CONFIG[btn.score].bg)}>
                                <p className="text-2xl font-bold">{stats[btn.score as keyof typeof stats]}</p>
                                <p className="text-xs opacity-70">{btn.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="w-full flex flex-col gap-2">
                        {scoredQuestions.map((q, i) => {
                            const score = selfScores[q.id] ?? 3;
                            const cfg = SCORE_CONFIG[score] ?? SCORE_CONFIG[3];
                            return (
                                <div key={q.id} className={cn("text-left rounded-lg border p-2.5 flex flex-col gap-1.5", cfg.bg)}>
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium flex-1 whitespace-pre-wrap">{i + 1}. {q.question}</p>
                                        <span className={cn("text-xs font-bold shrink-0", cfg.color)}>{cfg.label}</span>
                                    </div>
                                    {q.answer && (
                                        <p className="text-xs text-muted-foreground/50 border-t border-border/20 pt-1.5 whitespace-pre-wrap">
                                            {q.answer}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <Button onClick={onComplete} className="w-full">Done</Button>
                </div>
            </div>
        );
    }

    if (!currentQuestion) return null;

    return (
        <div
            className="relative flex flex-col h-full bg-background select-none w-full"
            style={{ touchAction: showResult ? "none" : undefined }}
            // onPointerDown={handleDragStart}
        >
            {/* Drag-to-score overlay — temporarily disabled */}
            {false && isDragScoring && (
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                    <div className={cn(
                        "absolute inset-0 transition-colors duration-150",
                        hoveredScore === 0 ? "bg-red-950/75" :
                        hoveredScore === 4 ? "bg-yellow-950/70" :
                        hoveredScore === 5 ? "bg-green-950/75" :
                        "bg-black/65"
                    )} />

                    <div className={cn(
                        "absolute inset-y-0 left-0 w-44 transition-opacity duration-150 bg-gradient-to-r from-red-600/80 via-red-500/30 to-transparent",
                        hoveredScore === 0 ? "opacity-100" : "opacity-15"
                    )} />
                    <div className={cn(
                        "absolute inset-y-0 right-0 w-44 transition-opacity duration-150 bg-gradient-to-l from-green-600/80 via-green-500/30 to-transparent",
                        hoveredScore === 5 ? "opacity-100" : "opacity-15"
                    )} />
                    <div className={cn(
                        "absolute inset-x-0 top-0 h-32 transition-opacity duration-150 bg-gradient-to-b from-yellow-500/70 to-transparent",
                        hoveredScore === 4 ? "opacity-100" : "opacity-15"
                    )} />
                    <div className={cn(
                        "absolute inset-x-0 bottom-0 h-32 transition-opacity duration-150 bg-gradient-to-t from-zinc-600/50 to-transparent",
                        hoveredScore === null ? "opacity-100" : "opacity-0"
                    )} />

                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className={cn(
                            "text-5xl font-black tracking-widest transition-all duration-150 select-none",
                            hoveredScore === 0 ? "text-red-300" :
                            hoveredScore === 3 ? "text-yellow-300" :
                            hoveredScore === 5 ? "text-green-300" :
                            "text-zinc-400"
                        )}>
                            {hoveredScore === 0 ? "QUÊN" : hoveredScore === 3 ? "QUÊN NHẸ" : hoveredScore === 5 ? "NHỚ" : "HỦY"}
                        </span>
                    </div>

                    <span className={cn("absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold transition-all duration-150",
                        hoveredScore === 0 ? "text-red-300 scale-125" : "text-red-700/40 scale-100"
                    )}>←</span>
                    <span className={cn("absolute right-4 top-1/2 -translate-y-1/2 text-3xl font-bold transition-all duration-150",
                        hoveredScore === 5 ? "text-green-300 scale-125" : "text-green-700/40 scale-100"
                    )}>→</span>
                    <span className={cn("absolute top-4 left-1/2 -translate-x-1/2 text-3xl font-bold transition-all duration-150",
                        hoveredScore === 4 ? "text-yellow-300 scale-125" : "text-yellow-700/40 scale-100"
                    )}>↑</span>
                    <span className={cn("absolute bottom-4 left-1/2 -translate-x-1/2 text-sm font-medium transition-all duration-150",
                        hoveredScore === null ? "text-zinc-300" : "text-zinc-600/50"
                    )}>↓ cancel</span>
                </div>
            )}

            {/* Header */}
            <div className="shrink-0 px-3 pt-3 pb-2.5 border-b border-border w-full">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4 inline mr-1" />
                        Cancel
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleMarkDraft(); }}
                            title="Mark as draft and skip"
                            className="flex items-center gap-1 text-xs text-amber-600/70 hover:text-amber-400 transition-colors"
                        >
                            <PenLine className="w-3.5 h-3.5" />
                            Draft
                        </button>
                        <span className="text-xs text-muted-foreground">{currentIndex + 1} / {totalQuestions}</span>
                    </div>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col px-4 pt-6 pb-4 gap-4 max-w-lg mx-auto w-full"
            onClick={!showResult ? () => setShowResult(true) : undefined}
                
            >
                {/* Question */}
                <p className="text-lg font-semibold text-center leading-relaxed text-white shrink-0">
                    {currentQuestion.question}
                </p>

                {/* Answer box — always visible, blurred until tapped */}
                <div
                    className={cn(
                        "rounded-lg border border-zinc-700/50 bg-zinc-900/60 p-3 text-sm overflow-y-auto transition-[filter] duration-300 shrink-0",
                        !showResult && "cursor-pointer"
                    )}
                    style={{
                        filter: showResult ? "none" : "blur(7px)",
                        userSelect: showResult ? "text" : "none",
                        height: "calc(10 * 1.6rem)",
                    }}
                    
                >
                    {currentQuestion.answer
                        ? <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{currentQuestion.answer}</p>
                        : <p className="italic text-muted-foreground/40">—</p>
                    }
                </div>

                {/* Score buttons — fade in after reveal */}
                <div className={cn(
                    "flex items-center gap-1.5 shrink-0 transition-opacity duration-300",
                    !showResult && "opacity-0 pointer-events-none"
                )}>
                    {SCORE_BUTTONS.map(z => (
                        <button
                            key={z.score + z.label}
                            onClick={() => advanceWithScore(z.score)}
                            className={cn(
                                "flex-1 py-2.5 rounded-lg border text-sm font-bold transition-colors bg-transparent flex items-center justify-center",
                                z.btnClass
                            )}
                        >
                            <span className="text-xs">{z.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer hint */}
            <div className="shrink-0 px-3 py-3 border-t border-border text-center">
                <p className="text-xs text-muted-foreground/30">
                    {showResult ? "Click button to score" : "Tap to reveal"}
                </p>
            </div>
        </div>
    );
}
