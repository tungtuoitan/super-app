import React, { useEffect, useRef, useState } from "react";
import type { KDailySessionQuestion } from "./reviewApi";
import { submitAnswer, markDraft } from "./reviewApi";
import { getShikiHighlighter, parseFencedCode, SHIKI_THEME } from "./shikiHighlighter";

const REVEAL_DELAY_MS = 3000;
const SCORE_DELAY_MS  = 1500;
const FREE_WINDOW_SEC = 30;

const SCORE_BUTTONS = [
    { score: 1, label: "Again", color: "#ef4444", bg: "rgba(239,68,68,0.15)"   },
    { score: 2, label: "Hard",  color: "#f97316", bg: "rgba(249,115,22,0.15)"  },
    { score: 3, label: "Okay",  color: "#eab308", bg: "rgba(234,179,8,0.15)"   },
    { score: 4, label: "Good",  color: "#22c55e", bg: "rgba(34,197,94,0.15)"   },
    { score: 5, label: "Easy",  color: "#0ea5e9", bg: "rgba(14,165,233,0.15)"  },
];

interface Props {
    questions: KDailySessionQuestion[];
    onClose: () => void;
    onBreakChange?: (isBreak: boolean) => void;
}

export function ReviewOverlay({ questions, onClose, onBreakChange }: Props) {
    const [index,       setIndex]       = useState(0);
    const [showResult,  setShowResult]  = useState(false);
    const [canReveal,   setCanReveal]   = useState(false);
    const [canScore,    setCanScore]    = useState(false);
    const [freeLeft,    setFreeLeft]    = useState(0);
    const [isBreak,     setIsBreak]     = useState(false);
    const [contextHtml, setContextHtml] = useState("");
    const startRef = useRef(Date.now());

    const total   = questions.length;
    const current = questions[index];
    const progress = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

    // reset per question
    useEffect(() => {
        setShowResult(false);
        setCanReveal(false);
        setCanScore(false);
        setContextHtml("");
        startRef.current = Date.now();
        const t = setTimeout(() => setCanReveal(true), REVEAL_DELAY_MS);

        const raw = questions[index]?.context;
        if (raw) {
            const { lang, code } = parseFencedCode(raw);
            let cancelled = false;
            getShikiHighlighter().then(hl => {
                if (cancelled) return;
                setContextHtml(hl.codeToHtml(code, { lang, theme: SHIKI_THEME }));
            }).catch(() => {});
            return () => { cancelled = true; clearTimeout(t); };
        }

        return () => clearTimeout(t);
    }, [index]);

    // score delay after reveal
    useEffect(() => {
        if (!showResult) return;
        setCanScore(false);
        const t = setTimeout(() => setCanScore(true), SCORE_DELAY_MS);
        return () => clearTimeout(t);
    }, [showResult, index]);

    // free-window countdown
    useEffect(() => {
        onBreakChange?.(isBreak);
        if (!isBreak) return;
        setFreeLeft(FREE_WINDOW_SEC);
        const iv = setInterval(() => {
            setFreeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(iv);
                    setIsBreak(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(iv);
    }, [isBreak]);

    const advance = () => {
        const next = index + 1;
        if (next >= total) { onClose(); return; }
        setIndex(next);
        setIsBreak(true);
    };

    const handleReveal = () => {
        if (!canReveal || showResult) return;
        setShowResult(true);
    };

    const handleScore = (score: number) => {
        if (!canScore) return;
        const elapsed = Date.now() - startRef.current;
        submitAnswer(current.id, score, elapsed);
        advance();
    };

    const handleDraft = () => {
        markDraft(current.id);
        advance();
    };

    const overlayVisible = !isBreak;

    return (
        <>
            {/* Backdrop */}
            {overlayVisible && (
                <div style={{
                    position: "fixed", inset: 0, zIndex: 2147483639,
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    pointerEvents: "none",
                }} />
            )}

            {/* Center card */}
            {overlayVisible && (
                <div
                    style={{
                        position: "fixed",
                        top: "50%", left: "50%",
                        transform: "translate(-50%, -50%)",
                        zIndex: 2147483640,
                        width: "min(560px, 92vw)",
                        maxHeight: "85vh",
                        display: "flex",
                        flexDirection: "column",
                        background: "#18181b",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 16,
                        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        color: "#f4f4f5",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        overflow: "hidden",
                    }}
                    onContextMenu={e => e.preventDefault()}
                >
                    {/* Header */}
                    <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 12, color: "#71717a" }}>K Review</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <button
                                    onClick={handleDraft}
                                    style={{
                                        fontSize: 11, color: "#a16207", background: "rgba(161,98,7,0.12)",
                                        border: "1px solid rgba(161,98,7,0.3)", borderRadius: 6,
                                        padding: "2px 8px", cursor: "pointer",
                                    }}
                                >
                                    Draft
                                </button>
                                <span style={{ fontSize: 12, color: "#71717a" }}>{index + 1} / {total}</span>
                            </div>
                        </div>
                        <div style={{ height: 3, borderRadius: 9999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 9999, background: "#6366f1", width: `${progress}%`, transition: "width 0.3s" }} />
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                        {current?.nodeName && (
                            <p style={{ fontSize: 11, color: "#a78bfa", textAlign: "center", margin: 0 }}>{current.nodeName}</p>
                        )}

                        {/* Question */}
                        <p style={{ fontSize: 17, fontWeight: 600, textAlign: "center", lineHeight: 1.5, margin: 0, color: "#f4f4f5" }}>
                            {current?.question}
                        </p>

                        {/* Context code block */}
                        {current?.context && (
                            <div style={{
                                borderRadius: 8,
                                border: "1px solid rgba(255,255,255,0.08)",
                                overflow: "hidden",
                                maxHeight: 180,
                                overflowY: "auto",
                                flexShrink: 0,
                                fontSize: 12,
                                lineHeight: 1.55,
                                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                            }}>
                                {contextHtml
                                    ? <div dangerouslySetInnerHTML={{ __html: contextHtml }} style={{ margin: 0 }} />
                                    : <pre style={{ margin: 0, padding: "10px 12px", color: "rgba(244,244,245,0.75)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                                        {current.context.replace(/^```\w*\n?/, "").replace(/\n?```$/, "")}
                                      </pre>
                                }
                            </div>
                        )}

                        {/* Answer box */}
                        <div
                            onClick={handleReveal}
                            style={{
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,0.1)",
                                background: "#09090b",
                                padding: 14,
                                minHeight: 80,
                                fontSize: 14,
                                lineHeight: 1.6,
                                cursor: canReveal && !showResult ? "pointer" : "default",
                                filter: showResult ? "none" : "blur(6px)",
                                transition: "filter 0.25s",
                                position: "relative",
                                color: "rgba(244,244,245,0.85)",
                                whiteSpace: "pre-wrap",
                            }}
                        >
                            {current?.answer
                                ? current.answer
                                : <span style={{ color: "rgba(244,244,245,0.3)", fontStyle: "italic" }}>—</span>
                            }
                            {!showResult && canReveal && (
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase" }}>tap</span>
                                </div>
                            )}
                        </div>

                        {/* Score buttons */}
                        <div style={{ display: "flex", gap: 8, opacity: showResult ? (canScore ? 1 : 0.4) : 0, pointerEvents: showResult && canScore ? "all" : "none", transition: "opacity 0.3s" }}>
                            {SCORE_BUTTONS.map(b => (
                                <button
                                    key={b.score}
                                    onClick={() => handleScore(b.score)}
                                    disabled={!canScore}
                                    style={{
                                        flex: 1, padding: "10px 4px", borderRadius: 8,
                                        border: `1px solid ${b.color}66`,
                                        background: b.bg, color: b.color,
                                        cursor: canScore ? "pointer" : "not-allowed",
                                        fontSize: 11, fontWeight: 700,
                                    }}
                                >
                                    {b.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Footer hint */}
                    <div style={{ padding: "8px 16px 12px", textAlign: "center", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                            {!showResult && canReveal ? "Tap answer to reveal" : !showResult && !canReveal ? "..." : ""}
                        </span>
                    </div>
                </div>
            )}

            {/* Break badge */}
            {isBreak && (
                <div style={{
                    position: "fixed", bottom: 24, right: 24, zIndex: 2147483641,
                    background: "#18181b", border: "1px solid rgba(99,102,241,0.5)",
                    borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#a5b4fc",
                    fontFamily: "system-ui, sans-serif",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                }}>
                    Next question in <b style={{ color: "#818cf8" }}>{freeLeft}s</b>
                </div>
            )}
        </>
    );
}
