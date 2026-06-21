import { useState, useRef, useEffect } from "react";
import { useDeviceStore } from "@/shared";
import { KQuizService } from "../../service/kQuiz.service";
import type { KDailySessionQuestion, KDailyAnswerItem } from "../../types/kQuiz.type";
import { REVEAL_DELAY_MS, SCORE_DELAY_MS, BALL_BG } from "./kDailyReviewSession.constants";
import { scoreFromSamples } from "./kDailyReviewSession.utils";

export interface KDailyReviewSessionProps {
    nodeId: number;
    quizTitle: string;
    questions: KDailySessionQuestion[];
    onComplete: () => void;
    onBack: () => void;
    isQuickQuiz?: boolean;
}

export function useKDailyReviewSession({ nodeId, questions, onComplete, isQuickQuiz }: Pick<KDailyReviewSessionProps, "nodeId" | "questions" | "onComplete" | "isQuickQuiz">) {
    const { isMobile } = useDeviceStore();
    const [scoreMode, setScoreMode] = useState<"throw" | "click">("throw");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timings, setTimings]           = useState<Record<number, number>>({});
    const [isSubmitted, setIsSubmitted]   = useState(false);
    const [selfScores, setSelfScores]     = useState<Record<number, number>>({});
    const draftedIdsRef = useRef<Set<number>>(new Set());
    const [showResult, setShowResult]     = useState(false);
    const [isDragScoring, setIsDragScoring] = useState(false);
    const [hoveredScore, setHoveredScore]   = useState<number | null>(null);
    const [dragPos, setDragPos]             = useState<{ x: number; y: number } | null>(null);
    const [flyCircle, setFlyCircle]         = useState<{ x: number; y: number; opacity: number; score: number } | null>(null);

    const questionStartRef  = useRef<number>(Date.now());
    const timersRef         = useRef<ReturnType<typeof setTimeout>[]>([]);
    const advanceWithScoreRef = useRef<(score: number) => void>(() => {});
    const showResultRef       = useRef(false);
    const canScoreRef         = useRef(false);
    const lastHoveredRef      = useRef<number | null>(null);
    const contentRef          = useRef<HTMLDivElement | null>(null);
    const contentRectRef      = useRef<DOMRect | null>(null);
    const swipeOriginRef      = useRef<{ x: number; y: number } | null>(null);
    const samplesRef          = useRef<{ x: number; y: number; t: number }[]>([]);
    const inertiaRafRef       = useRef<number | null>(null);

    const [revealSecondsLeft, setRevealSecondsLeft] = useState(Math.ceil(REVEAL_DELAY_MS / 1000));
    const canReveal = revealSecondsLeft <= 0;

    const [scoreSecondsLeft, setScoreSecondsLeft] = useState(0);
    const canScore = showResult && scoreSecondsLeft <= 0;

    const totalQuestions  = questions.length;
    const currentQuestion = questions[currentIndex];
    const progress        = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;

    const haloColor = hoveredScore !== null ? BALL_BG[hoveredScore] : "rgba(161,161,170,0.7)";

    useEffect(() => { questionStartRef.current = Date.now(); }, [currentIndex]);
    useEffect(() => () => {
        timersRef.current.forEach(clearTimeout);
        if (inertiaRafRef.current !== null) cancelAnimationFrame(inertiaRafRef.current);
    }, []);

    useEffect(() => {
        const block = (e: Event) => e.preventDefault();
        document.addEventListener("contextmenu", block);
        document.addEventListener("selectstart", block);
        return () => {
            document.removeEventListener("contextmenu", block);
            document.removeEventListener("selectstart", block);
        };
    }, []);

    useEffect(() => {
        setRevealSecondsLeft(Math.ceil(REVEAL_DELAY_MS / 1000));
        const start = Date.now();
        const tick = setInterval(() => {
            const left = Math.max(0, Math.ceil((REVEAL_DELAY_MS - (Date.now() - start)) / 1000));
            setRevealSecondsLeft(left);
            if (left <= 0) clearInterval(tick);
        }, 100);
        return () => clearInterval(tick);
    }, [currentIndex]);

    useEffect(() => {
        if (!showResult) { setScoreSecondsLeft(0); return; }
        setScoreSecondsLeft(Math.ceil(SCORE_DELAY_MS / 1000));
        const start = Date.now();
        const tick = setInterval(() => {
            const left = Math.max(0, Math.ceil((SCORE_DELAY_MS - (Date.now() - start)) / 1000));
            setScoreSecondsLeft(left);
            if (left <= 0) clearInterval(tick);
        }, 100);
        return () => clearInterval(tick);
    }, [showResult, currentIndex]);

    showResultRef.current = showResult;
    canScoreRef.current   = canScore;

    const submitSingleAnswer = (qId: number, score: number, responseTimeMs: number): Promise<void> => {
        if (isQuickQuiz) return Promise.resolve();
        const answers: KDailyAnswerItem[] = [{
            questionId: qId,
            answerText: null,
            responseTimeMs,
            selfScore: score,
        }];
        return KQuizService._submitDailyAnswers(nodeId, { answers })
            .then(() => {})
            .catch(() => { /* silent */ });
    };

    const advanceWithScore = async (score: number) => {
        if (isSubmitted) return;
        const qId = currentQuestion?.id;
        const elapsed = Date.now() - questionStartRef.current;
        const newTimings = qId !== undefined ? { ...timings, [qId]: (timings[qId] ?? 0) + elapsed } : timings;
        const newScores  = qId !== undefined ? { ...selfScores, [qId]: score } : selfScores;
        if (qId !== undefined) { setTimings(newTimings); setSelfScores(newScores); }
        const isLast = currentIndex >= totalQuestions - 1;
        if (qId !== undefined) {
            const totalElapsed = newTimings[qId];
            if (isLast) {
                setIsSubmitted(true);
                await submitSingleAnswer(qId, score, totalElapsed);
                onComplete();
                return;
            }
            submitSingleAnswer(qId, score, totalElapsed);
        }
        setShowResult(false);
        setCurrentIndex(i => i + 1);
    };
    advanceWithScoreRef.current = advanceWithScore;

    const handleMarkDraft = async () => {
        if (isSubmitted) return;
        const qId = currentQuestion?.id;
        if (qId === undefined) return;
        draftedIdsRef.current = new Set(draftedIdsRef.current).add(qId);
        if (currentIndex >= totalQuestions - 1) {
            setIsSubmitted(true);
            await KQuizService._markQuestionDraft(nodeId, qId).catch(() => {});
            onComplete();
            return;
        }
        KQuizService._markQuestionDraft(nodeId, qId).catch(() => {});
        setShowResult(false);
        setCurrentIndex(i => i + 1);
    };

    const handleSwipeStart = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!showResultRef.current) return;
        if (!canScoreRef.current) return;
        e.preventDefault();
        if (inertiaRafRef.current !== null) { cancelAnimationFrame(inertiaRafRef.current); inertiaRafRef.current = null; }
        const rect = e.currentTarget.getBoundingClientRect();
        contentRectRef.current = rect;
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        swipeOriginRef.current = { x: localX, y: localY };
        samplesRef.current = [{ x: localX, y: localY, t: performance.now() }];
        setIsDragScoring(true);
        setDragPos({ x: localX, y: localY });
        setHoveredScore(null);
        lastHoveredRef.current = null;

        const onMove = (ev: PointerEvent) => {
            const r = contentRectRef.current;
            const origin = swipeOriginRef.current;
            if (!r || !origin) return;
            const lx = ev.clientX - r.left;
            const ly = ev.clientY - r.top;
            samplesRef.current.push({ x: lx, y: ly, t: performance.now() });
            const cutoff = performance.now() - 120;
            while (samplesRef.current.length > 4 && samplesRef.current[0].t < cutoff) samplesRef.current.shift();
            setDragPos({ x: lx, y: ly });
            const score = scoreFromSamples(samplesRef.current);
            if (score !== lastHoveredRef.current) {
                lastHoveredRef.current = score;
                setHoveredScore(score);
                if (score !== null && typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate(8);
                }
            }
        };

        const cleanup = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("pointercancel", onCancel);
        };

        const resetState = (commit: number | null) => {
            setDragPos(null);
            setHoveredScore(null);
            lastHoveredRef.current = null;
            contentRectRef.current = null;
            swipeOriginRef.current = null;
            samplesRef.current = [];
            if (commit !== null && inertiaRafRef.current === null) advanceWithScoreRef.current(commit);
            setIsDragScoring(false);
        };

        const startFly = (commit: number | null) => {
            const r = contentRectRef.current;
            const samples = samplesRef.current;
            if (!r || samples.length === 0 || commit === null) {
                resetState(commit);
                return;
            }

            const tail   = samples[samples.length - 1];
            const recent = samples.find(s => s.t >= tail.t - 80) ?? samples[0];
            const dt = Math.max(8, tail.t - recent.t);
            let vx = ((tail.x - recent.x) / dt) * 16;
            let vy = ((tail.y - recent.y) / dt) * 16;
            const speed = Math.hypot(vx, vy);

            if (speed < 0.5) {
                const origin = swipeOriginRef.current;
                if (origin) {
                    const dx = tail.x - origin.x;
                    const dy = tail.y - origin.y;
                    const len = Math.max(1, Math.hypot(dx, dy));
                    vx = (dx / len) * 22;
                    vy = (dy / len) * 22;
                } else {
                    resetState(null);
                    return;
                }
            } else {
                const boost = Math.max(1, 30 / speed);
                vx *= boost;
                vy *= boost;
            }

            setIsDragScoring(false);
            setDragPos(null);
            setHoveredScore(null);

            let x = tail.x;
            let y = tail.y;
            let opacity = 1;
            let crossed = false;

            const step = () => {
                vx *= 0.985;
                vy *= 0.985;
                x += vx;
                y += vy;
                if (!crossed && (x < -40 || x > r.width + 40 || y < -40 || y > r.height + 40)) {
                    crossed = true;
                }
                if (crossed) opacity = Math.max(0, opacity - 0.08);
                setFlyCircle({ x, y, opacity, score: commit });
                if (opacity <= 0) {
                    inertiaRafRef.current = null;
                    setFlyCircle(null);
                    resetState(commit);
                    return;
                }
                inertiaRafRef.current = requestAnimationFrame(step);
            };
            inertiaRafRef.current = requestAnimationFrame(step);
        };

        const onUp = (ev: PointerEvent) => {
            cleanup();
            const r = contentRectRef.current;
            if (r) samplesRef.current.push({ x: ev.clientX - r.left, y: ev.clientY - r.top, t: performance.now() });
            const score = scoreFromSamples(samplesRef.current);
            startFly(score);
        };
        const onCancel = () => {
            cleanup();
            resetState(null);
        };

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        document.addEventListener("pointercancel", onCancel);
    };

    return {
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
        haloColor,
        currentQuestion,
        totalQuestions,
        progress,
        advanceWithScore,
        handleMarkDraft,
        handleSwipeStart,
    };
}
