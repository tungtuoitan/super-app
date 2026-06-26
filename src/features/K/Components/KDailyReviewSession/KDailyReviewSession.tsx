import { useState, useEffect } from "react";
import { ArrowLeft, PenLine, Move, LayoutGrid, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCORE_DELAY_MS, BALL_BG, RING_COLOR, NEUTRAL_RING, SCORE_BUTTONS, SCORE_CONFIG } from "./kDailyReviewSession.constants";
import { useKDailyReviewSession, type KDailyReviewSessionProps } from "./useKDailyReviewSession.helper";
import { KAttachmentViewerDialog } from "../small/KAttachmentViewerDialog";
import type { KAttachment } from "../../types/kAttachment.type";
import { getShikiHighlighter, SHIKI_THEME } from "../../utils/shikiHighlighter";

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

    const [selectedAtt, setSelectedAtt] = useState<KAttachment | null>(null);
    const [contextHtml, setContextHtml] = useState<string>("");

    useEffect(() => {
        const raw = currentQuestion?.context;
        if (!raw) { setContextHtml(""); return; }
        // Extract language from opening fence line e.g. ```python
        const langMatch = raw.match(/^```(\w*)/);
        const lang = langMatch?.[1] || "text";
        // Strip fence lines to get the raw code
        const code = raw.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
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
            <div className="shrink-0 px-3 pt-3 pb-2.5 border-b border-border w-full">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4 inline mr-1" />
                        Cancel
                    </button>
                    <div className="flex items-center gap-2">
                        {!isMobile && (
                            <button
                                onClick={() => setScoreMode(scoreMode === "throw" ? "click" : "throw")}
                                title={scoreMode === "throw" ? "Switch to button mode" : "Switch to throw mode"}
                                className="flex items-center gap-1.5 text-xs transition-colors"
                            >
                                <Move className={cn("w-3.5 h-3.5 transition-colors", scoreMode === "throw" ? "text-zinc-300" : "text-zinc-600")} />
                                <span className="text-zinc-700 text-[10px]">/</span>
                                <LayoutGrid className={cn("w-3.5 h-3.5 transition-colors", scoreMode === "click" ? "text-zinc-300" : "text-zinc-600")} />
                            </button>
                        )}
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
            <div
                id='review-content'
                ref={contentRef}
                className="relative flex-1 flex flex-col px-4 pt-6 pb-4 gap-4 max-w-lg mx-auto w-full overflow-hidden"
                onClick={!showResult && canReveal ? () => { setShowResult(true); setScoreSecondsLeft(Math.ceil(SCORE_DELAY_MS / 1000)); } : undefined}
                onPointerDown={isMobile && scoreMode === "throw" && showResult && canScore ? handleSwipeStart : undefined}
                style={{ touchAction: isMobile && showResult ? "none" : undefined }}
            >
                {/* Owning node — only present in knowledge-wide sessions (e.g. Review All) */}
                {currentQuestion.nodeName && (
                    <p className="text-xs font-medium text-purple-300/80 text-center -mb-2 shrink-0 truncate">
                        {currentQuestion.nodeName}
                    </p>
                )}

                {/* Question */}
                <p className="text-lg font-semibold text-center leading-relaxed text-white shrink-0">
                    {currentQuestion.question}
                </p>

                {/* Attachment pills — shown when question has code attachments */}
                {currentQuestion.attachments && currentQuestion.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 shrink-0 -mt-2">
                        {currentQuestion.attachments.map(att => (
                            <button
                                key={att.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedAtt(att); }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-zinc-400 bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-200 transition-colors font-mono"
                            >
                                <Code2 className="w-3 h-3 shrink-0" />
                                {att.title}
                            </button>
                        ))}
                    </div>
                )}

                {/* Context code block — always visible, including after reveal */}
                {contextHtml && (
                    <div className="shrink-0 rounded-lg border border-zinc-700/50 overflow-hidden text-left">
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
                            "rounded-lg border border-zinc-700/50 bg-zinc-900/60 p-3 text-sm overflow-y-auto transition-[filter] duration-300 h-full",
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
                            ? <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">{currentQuestion.answer}</p>
                            : <p className="italic text-muted-foreground/40">—</p>
                        }
                    </div>


                    {/* Tap hint — appears when reveal is unlocked but answer not yet shown */}
                    {!showResult && canReveal && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-xs text-white/40 font-medium uppercase tracking-widest animate-pulse">tap</span>
                        </div>
                    )}
                </div>


                {/* Score buttons — desktop only; mobile always uses ball gesture */}
                {!isMobile && (
                    <div className={cn(
                        "flex items-center gap-1.5 shrink-0 transition-opacity duration-300",
                        !showResult && "opacity-0 pointer-events-none",
                        showResult && !canScore && "opacity-50 pointer-events-none"
                    )}>
                        {SCORE_BUTTONS.map(z => (
                            <button
                                key={z.score + z.label}
                                onClick={() => advanceWithScore(z.score)}
                                disabled={!canScore}
                                className={cn(
                                    "flex-1 py-2.5 rounded-lg border text-sm font-bold transition-colors bg-transparent flex items-center justify-center",
                                    z.btnClass,
                                    !canScore && "cursor-not-allowed"
                                )}
                            >
                                <span className="text-xs">{z.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Swipe-to-score overlay — only in throw mode */}
                {isMobile && scoreMode === "throw" && (isDragScoring || flyCircle !== null || canScore) && (
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">

                        {/* Active drag: circle follows finger */}
                        {isDragScoring && dragPos && (
                            <div
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center font-bold pointer-events-none text-white"
                                style={{
                                    left:   dragPos.x,
                                    top:    dragPos.y,
                                    width:  48,
                                    height: 48,
                                    background: hoveredScore !== null ? BALL_BG[hoveredScore] : "rgba(10,10,10,0.82)",
                                    border: `1.5px solid ${hoveredScore !== null ? RING_COLOR[hoveredScore] : NEUTRAL_RING}`,
                                    boxShadow: "0 2px 10px rgba(0,0,0,0.40)",
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
                                className="absolute rounded-full -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center font-bold pointer-events-none text-white"
                                style={{
                                    left:    flyCircle.x,
                                    top:     flyCircle.y,
                                    width:   48,
                                    height:  48,
                                    opacity: flyCircle.opacity,
                                    background: BALL_BG[flyCircle.score],
                                    border: `1.5px solid ${RING_COLOR[flyCircle.score]}`,
                                    boxShadow: "0 2px 10px rgba(0,0,0,0.40)",
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
                                    <span className="text-zinc-600 text-base leading-none">↑</span>
                                </div>
                                <div className="absolute bottom-3 inset-x-0 flex justify-center">
                                    <span className="text-zinc-600 text-base leading-none">↓</span>
                                </div>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <span className="text-zinc-600 text-base leading-none">←</span>
                                </div>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <span className="text-zinc-600 text-base leading-none">→</span>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Footer hint */}
            <div className="shrink-0 px-3 py-3 border-t border-border text-center">
                <p className="text-xs text-muted-foreground/30">
                    {!showResult && canReveal ? "Tap to reveal" : ""}
                </p>
            </div>

            <KAttachmentViewerDialog atts={currentQuestion.attachments ?? []} att={selectedAtt} onClose={() => setSelectedAtt(null)} />
        </div>
    );
}
