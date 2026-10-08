import { useState, useEffect } from "react";
import { marked } from "marked";
import { ArrowLeft, PenLine, Move, LayoutGrid, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCORE_DELAY_MS, BALL_BG, RING_COLOR, NEUTRAL_RING, NEUTRAL_BALL_BG, SCORE_BUTTONS, SCORE_CONFIG } from "./kDailyReviewSession.constants";
import { useKDailyReviewSession, type KDailyReviewSessionProps } from "./useKDailyReviewSession.helper";
import { KAttachmentViewerDialog } from "../small/KAttachmentViewerDialog";
import type { KAttachment } from "../../types/kAttachment.type";
import { getShikiHighlighter, SHIKI_THEME, parseFencedCode } from "../../utils/shikiHighlighter";
import { Button, useDebugLog } from "@/shared";

marked.setOptions({ breaks: true });

export function KDailyReviewSession({ nodeId, quizTitle, questions, onComplete, onBack, isQuickQuiz }: KDailyReviewSessionProps) {
    const {
        isMobile,
        scoreMode,
        setScoreMode,
        currentIndex,
        showResult,
        setShowResult,
        setScoreSecondsLeft,
        isDragScoring,
        hoveredScore,
        dragPos,
        flyCircle,
        contentRef,
        canReveal,
        canScore,
        currentQuestion,
        totalQuestions,
        progress,
        advanceWithScore,
        handleMarkDraft,
        handleSwipeStart,
    } = useKDailyReviewSession({ nodeId, questions, onComplete, isQuickQuiz });

    const debugLog = useDebugLog();
    const [selectedAtt, setSelectedAtt] = useState<KAttachment | null>(null);
    const [contextHtml, setContextHtml] = useState<string>("");

    // Log session load: dump open-context/close-context scope summary
    useEffect(() => {
        if (!questions?.length) return;
        const scopeSummary = questions.map(q => ({
            id: q.id,
            directives: (q as any).directives ?? null,
            hasContext: q.context != null && q.context !== "",
            contextLen: q.context?.length ?? 0,
        }));
        const openers  = scopeSummary.filter(x => Array.isArray(x.directives) && x.directives.includes("open-context")).map(x => x.id);
        const closers  = scopeSummary.filter(x => Array.isArray(x.directives) && x.directives.includes("close-context")).map(x => x.id);
        const withCtx  = scopeSummary.filter(x => x.hasContext).map(x => x.id);
        debugLog.log("KDailyReviewSession", "session-load-scope", {
            totalQuestions: questions.length,
            openers,
            closers,
            questionsWithContext: withCtx,
            detail: scopeSummary,
        });
        debugLog.flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questions]);

    // Log per-question context as user advances
    useEffect(() => {
        if (!currentQuestion) return;
        debugLog.log("KDailyReviewSession", "question-context-check", {
            questionId: currentQuestion.id,
            index: currentIndex,
            hasContext: currentQuestion.context != null && currentQuestion.context !== "",
            contextLen: currentQuestion.context?.length ?? 0,
            directives: (currentQuestion as any).directives ?? null,
        });
        debugLog.flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentQuestion?.id]);

    useEffect(() => {
        const raw = currentQuestion?.context;
        if (!raw) { setContextHtml(""); return; }
        const { lang, code } = parseFencedCode(raw);
        let cancelled = false;
        getShikiHighlighter()
            .then(hl => {
                if (cancelled) return;
                const html = hl.codeToHtml(code, { lang, theme: SHIKI_THEME });
                setContextHtml(html);
            })
            .catch(() => { if (!cancelled) setContextHtml(""); });
        return () => { cancelled = true; };
    }, [currentQuestion?.id]);

    // ── Summary screen (disabled — session auto-completes on last answer) ────
    // Uncomment the block below to re-enable the summary + Done button flow.
    //
    // if (isSubmitted) {
    //     const scoredQuestions = questions.filter(q => !draftedIdsRef.current.has(q.id));
    //     const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    //     scoredQuestions.forEach(q => {
    //         const s = selfScores[q.id];
    //         if (s !== undefined && s in stats) {
    //             stats[s as keyof typeof stats]++;
    //         }
    //     });
    //
    //     return (
    //         <div className="flex flex-col h-full overflow-auto">
    //             <div className="flex flex-col items-center gap-5 px-3 py-6 max-w-lg mx-auto w-full">
    //                 <div className="text-center">
    //                     <h2 className="text-base font-semibold">{quizTitle}</h2>
    //                     <p className="text-xs text-muted-foreground mt-0.5">{scoredQuestions.length} question{scoredQuestions.length !== 1 ? "s" : ""}</p>
    //                 </div>
    //
    //                 <div className="flex gap-2.5 w-full flex-wrap">
    //                     {SCORE_BUTTONS.map(btn => (
    //                         <div key={btn.score} className={cn("flex-1 min-w-fit text-center rounded-lg border py-3", SCORE_CONFIG[btn.score].bg)}>
    //                             <p className="text-2xl font-bold">{stats[btn.score as keyof typeof stats]}</p>
    //                             <p className="text-xs opacity-70">{btn.label}</p>
    //                         </div>
    //                     ))}
    //                 </div>
    //
    //                 <div className="w-full flex flex-col gap-2">
    //                     {scoredQuestions.map((q, i) => {
    //                         const score = selfScores[q.id] ?? 3;
    //                         const cfg = SCORE_CONFIG[score] ?? SCORE_CONFIG[3];
    //                         return (
    //                             <div key={q.id} className={cn("text-left rounded-lg border p-2.5 flex flex-col gap-1.5", cfg.bg)}>
    //                                 <div className="flex items-start justify-between gap-2">
    //                                     <p className="text-sm font-medium flex-1 whitespace-pre-wrap">{i + 1}. {q.question}</p>
    //                                     <span className={cn("text-xs font-bold shrink-0", cfg.color)}>{cfg.label}</span>
    //                                 </div>
    //                                 {q.answer && (
    //                                     <p className="text-xs text-muted-foreground/50 border-t border-border/20 pt-1.5 whitespace-pre-wrap">
    //                                         {q.answer}
    //                                     </p>
    //                                 )}
    //                             </div>
    //                         );
    //                     })}
    //                 </div>
    //
    //                 <Button onClick={onComplete} className="w-full">Done</Button>
    //             </div>
    //         </div>
    //     );
    // }

    if (!currentQuestion) return null;

    return (
        <div
            className="relative flex flex-col h-full bg-background select-none w-full"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            // @ts-expect-error onSelectStart is non-standard but supported in Chrome/Edge/Safari
            onSelectStart={(e: React.SyntheticEvent) => e.preventDefault()}
            style={{
                touchAction: isMobile && showResult ? "none" : undefined,
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            {/* Header */}
            <div className="shrink-0 px-4 pt-3 pb-3 border-b border-sa-border w-full">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={onBack} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 -ml-1.5 text-[13px] text-muted-foreground hover:bg-sa-hover hover:text-foreground transition-colors duration-100">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Cancel
                    </button>
                    <div className="flex items-center gap-3">
                        {!isMobile && (
                            <button
                                onClick={() => setScoreMode(scoreMode === "throw" ? "click" : "throw")}
                                title={scoreMode === "throw" ? "Switch to button mode" : "Switch to throw mode"}
                                className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs hover:bg-sa-hover transition-colors duration-100"
                            >
                                <Move className={cn("w-3.5 h-3.5 transition-colors", scoreMode === "throw" ? "text-foreground" : "text-muted-foreground/50")} />
                                <span className="text-muted-foreground/40 text-[10px]">/</span>
                                <LayoutGrid className={cn("w-3.5 h-3.5 transition-colors", scoreMode === "click" ? "text-foreground" : "text-muted-foreground/50")} />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleMarkDraft(); }}
                            title="Mark as draft and skip"
                            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-sa-hover hover:text-sa-amber-ink transition-colors duration-100"
                        >
                            <PenLine className="w-3.5 h-3.5" />
                            Draft
                        </button>
                        <span className="font-mono text-xs text-muted-foreground">{currentIndex + 1} / {totalQuestions}</span>
                    </div>
                </div>
                <div className="h-[3px] rounded-full bg-sa-border overflow-hidden">
                    <div className="h-full rounded-full bg-sa-amber transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* Content */}
            <div
                id='review-content'
                ref={contentRef}
                className="relative flex-1 flex flex-col px-4 pt-8 pb-4 gap-5 max-w-xl mx-auto w-full overflow-hidden"
                onClick={!showResult && canReveal ? () => { setShowResult(true); setScoreSecondsLeft(Math.ceil(SCORE_DELAY_MS / 1000)); } : undefined}
                onPointerDown={isMobile && scoreMode === "throw" && showResult && canScore ? handleSwipeStart : undefined}
                style={{ touchAction: isMobile && showResult ? "none" : undefined }}
            >
                {/* Owning node — only present in knowledge-wide sessions (e.g. Review All) */}
                {currentQuestion.nodeName && (
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground text-center -mb-2 shrink-0 truncate">
                        {currentQuestion.nodeName}
                    </p>
                )}

                {/* Question */}
                <p
                    className="text-[20px] font-medium text-center leading-[1.6] tracking-[-0.01em] text-foreground shrink-0"
                    dangerouslySetInnerHTML={{ __html: marked.parseInline(currentQuestion.question) as string }}
                />

                {/* Attachment pills — shown when question has code attachments */}
                {currentQuestion.attachments && currentQuestion.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 shrink-0 -mt-2">
                        {currentQuestion.attachments.map(att => (
                            <button
                                key={att.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedAtt(att); }}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-sa-border-strong text-[11px] text-muted-foreground hover:bg-sa-hover hover:text-foreground transition-colors duration-100 font-mono"
                            >
                                <Code2 className="w-3 h-3 shrink-0" />
                                {att.title}
                            </button>
                        ))}
                    </div>
                )}

                {/* Context code block — always visible, including after reveal */}
                {contextHtml && (
                    <div className="shrink-0 rounded-xl border border-sa-border overflow-hidden text-left">
                        <div
                            className="shiki-host text-[12px] leading-[1.55] font-mono max-h-48 overflow-auto text-left [&_pre]:px-4 [&_pre]:py-3 [&_pre]:m-0 [&_pre]:min-w-max [&_pre]:text-left [&_code]:text-left"
                            dangerouslySetInnerHTML={{ __html: contextHtml }}
                        />
                    </div>
                )}

                {/* Answer box — always visible, blurred until tapped */}
                <div className="relative shrink-0" style={{ height: "calc(10 * 1.6rem)" }}>
                    <div
                        className={cn(
                            "rounded-xl border border-sa-border bg-sa-surface px-4 py-3.5 text-[15px] leading-[1.6] overflow-y-auto transition-[filter] duration-300 h-full",
                            !showResult && canReveal && "cursor-pointer",
                            !showResult && !canReveal && "cursor-not-allowed"
                        )}
                        style={{
                            filter: showResult ? "none" : "blur(7px)",
                            userSelect: isMobile ? "none" : (showResult ? "text" : "none"),
                            WebkitUserSelect: isMobile ? "none" : (showResult ? "text" : "none"),
                            WebkitTouchCallout: "none",
                            touchAction: isMobile && showResult ? "none" : undefined,
                            overflowY: isMobile && showResult && canScore ? "hidden" : "auto",
                        }}
                    >
                        {currentQuestion.answer
                            ? <div
                                className="leading-[1.6] text-foreground/90"
                                dangerouslySetInnerHTML={{ __html: marked.parse(currentQuestion.answer) as string }}
                              />
                            : <p className="italic text-muted-foreground/40">&#8212;</p>
                        }
                    </div>

                    {/* Tap hint — appears when reveal is unlocked but answer not yet shown */}
                    {!showResult && canReveal && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest animate-pulse">tap</span>
                        </div>
                    )}
                </div>

                {/* Score buttons — desktop only; mobile always uses ball gesture */}
                {!isMobile && (
                    <div className={cn(
                        "flex items-center gap-2 shrink-0 transition-opacity duration-300",
                        !showResult && "opacity-0 pointer-events-none",
                        showResult && !canScore && "opacity-50 pointer-events-none"
                    )}>
                        {SCORE_BUTTONS.map(z => (
                            <Button
                                key={z.score + z.label}
                                variant="outline"
                                onClick={() => advanceWithScore(z.score)}
                                disabled={!canScore}
                                className={cn(
                                    "flex-1 h-10 text-[13px]",
                                    z.btnClass,
                                    !canScore && "cursor-not-allowed"
                                )}
                            >
                                {z.label}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Swipe-to-score overlay — only in throw mode */}
                {isMobile && scoreMode === "throw" && (isDragScoring || flyCircle !== null || canScore) && (
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">

                        {/* Active drag: circle follows finger */}
                        {isDragScoring && dragPos && (
                            <div
                                className={cn("absolute rounded-full -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center font-semibold pointer-events-none", hoveredScore !== null ? "text-background" : "text-foreground")}
                                style={{
                                    left:   dragPos.x,
                                    top:    dragPos.y,
                                    width:  48,
                                    height: 48,
                                    background: hoveredScore !== null ? BALL_BG[hoveredScore] : NEUTRAL_BALL_BG,
                                    border: `1.5px solid ${hoveredScore !== null ? RING_COLOR[hoveredScore] : NEUTRAL_RING}`,
                                    backdropFilter: "blur(12px)",
                                    WebkitBackdropFilter: "blur(12px)",
                                }}
                            >
                                <span className="text-base leading-none">{hoveredScore ?? "·"}</span>
                                {hoveredScore !== null && (
                                    <span className="text-[7px] uppercase tracking-[0.1em] mt-0.5 opacity-70">
                                        {SCORE_BUTTONS[hoveredScore - 1].label}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Fly-out: circle flies in drag direction after release */}
                        {flyCircle !== null && (
                            <div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center font-semibold pointer-events-none text-background"
                                style={{
                                    left:    flyCircle.x,
                                    top:     flyCircle.y,
                                    width:   48,
                                    height:  48,
                                    opacity: flyCircle.opacity,
                                    background: BALL_BG[flyCircle.score],
                                    border: `1.5px solid ${RING_COLOR[flyCircle.score]}`,
                                    backdropFilter: "blur(12px)",
                                    WebkitBackdropFilter: "blur(12px)",
                                }}
                            >
                                <span className="text-base leading-none">{flyCircle.score}</span>
                                <span className="text-[7px] uppercase tracking-[0.1em] mt-0.5 opacity-70">
                                    {SCORE_BUTTONS[flyCircle.score - 1].label}
                                </span>
                            </div>
                        )}

                        {/* Drag affordance — abstract arrows, only shown when idle */}
                        {canScore && !isDragScoring && flyCircle === null && (
                            <>
                                <div className="absolute top-3 inset-x-0 flex justify-center">
                                    <span className="text-muted-foreground/50 text-base leading-none">↑</span>
                                </div>
                                <div className="absolute bottom-3 inset-x-0 flex justify-center">
                                    <span className="text-muted-foreground/50 text-base leading-none">↓</span>
                                </div>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <span className="text-muted-foreground/50 text-base leading-none">←</span>
                                </div>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <span className="text-muted-foreground/50 text-base leading-none">→</span>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Footer hint */}
            <div className="shrink-0 px-3 py-3 border-t border-sa-border text-center">
                <p className="text-xs text-muted-foreground/60">
                    {!showResult && canReveal ? "Tap to reveal" : ""}
                </p>
            </div>

            <KAttachmentViewerDialog atts={currentQuestion.attachments ?? []} att={selectedAtt} onClose={() => setSelectedAtt(null)} />
        </div>
    );
}
