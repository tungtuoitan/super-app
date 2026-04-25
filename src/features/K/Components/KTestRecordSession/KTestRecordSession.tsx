import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Loader2, CheckCircle2, XCircle, BookOpen, KeyRound, Send, PenLine } from "lucide-react";
import { KReviewEditor } from "../small/KReviewEditor";
import { Button } from "@/shared/components/ui/Button";
import { KTestService } from "../../service/kTest.service";
import { useKTestLoader } from "../../hooks/useKTest.loader";
import type { KTestQuestion, KQuestionGrade, KSubmitAnswersResult } from "../../types/kTest.type";

interface KTestRecordSessionProps {
    knowledgeId: number;
    testId: number;
    questions: KTestQuestion[];
    onComplete: () => void;
    onBack: () => void;
}

type AnswerMap = Record<number, string>;
type Phase = "answering" | "reviewing";

const TRANSITION_SECS = 2;

export function KTestRecordSession({ knowledgeId, testId, questions, onComplete, onBack }: KTestRecordSessionProps) {
    const { submitAnswers } = useKTestLoader();

    const [phase, setPhase]                     = useState<Phase>("answering");
    const [currentIndex, setCurrentIndex]       = useState(0);
    const [answers, setAnswers]                 = useState<AnswerMap>({});
    const [isRecording, setIsRecording]         = useState(false);
    const [transcribingIds, setTranscribingIds] = useState<Set<number>>(new Set());
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [countdown, setCountdown]             = useState(0);
    const [isSubmitting, setIsSubmitting]       = useState(false);
    const [result, setResult]                   = useState<KSubmitAnswersResult | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef        = useRef<Blob[]>([]);
    const streamRef        = useRef<MediaStream | null>(null);
    const answersRef       = useRef<AnswerMap>({});
    const touchStartX      = useRef<number | null>(null);
    const timersRef        = useRef<ReturnType<typeof setTimeout>[]>([]);

    answersRef.current = answers;

    const totalQuestions  = questions.length;
    const currentQuestion = questions[currentIndex];
    const progress        = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;

    // ── Recording helpers ──────────────────────────────────────────────────────

    const stopAndTranscribeBg = (qId: number) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === "inactive") { mediaRecorderRef.current = null; return; }

        mediaRecorderRef.current = null;

        // ondataavailable fires BEFORE onstop, so chunks are ready inside onstop
        recorder.onstop = async () => {
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            const allChunks = [...chunksRef.current];
            chunksRef.current = [];
            const blob = new Blob(allChunks, { type: "audio/webm" });
            if (blob.size === 0) return;
            setTranscribingIds(prev => new Set(prev).add(qId));
            try {
                const text = await KTestService._transcribeAudio(blob);
                if (text.trim()) {
                    setAnswers(prev => {
                        const existing = prev[qId] ?? "";
                        return { ...prev, [qId]: existing ? `${existing} ${text.trim()}` : text.trim() };
                    });
                }
            } catch { /* silent */ } finally {
                setTranscribingIds(prev => { const s = new Set(prev); s.delete(qId); return s; });
            }
        };

        recorder.stop();
        setIsRecording(false);
    }

    const startRecording = async () => {
        if (mediaRecorderRef.current) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch { /* no mic — session continues silently */ }
    }

    // Auto-start recording on each new question (answering phase only)
    useEffect(() => {
        if (phase === "answering" && !isTransitioning && currentQuestion && !result && !isSubmitting) {
            startRecording();
        }
    }, [currentIndex, isTransitioning, result, isSubmitting, phase]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            timersRef.current.forEach(clearTimeout);
            const rec = mediaRecorderRef.current;
            if (rec && rec.state !== "inactive") { rec.onstop = null; rec.stop(); }
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    // ── Enter review phase ──────────────────────────────────────────────────────

    const enterReviewPhase = () => {
        const qId = currentQuestion?.id;
        if (qId !== undefined) stopAndTranscribeBg(qId);
        setPhase("reviewing");
    };
    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Give background transcriptions a brief chance to land
        await new Promise(r => { const t = setTimeout(r, 800); timersRef.current.push(t); });
        try {
            const payload = questions.map(q => ({
                questionId: q.id,
                answerText: answersRef.current[q.id]?.trim() || null,
            }));
            const res = await submitAnswers(knowledgeId, testId, { answers: payload });
            setResult(res);
        } catch {
            setResult({
                totalPoints: 0, maxPoints: questions.length * 5, pct: 0,
                grades: questions.map(q => ({
                    questionId: q.id, question: q.question,
                    answerText: answersRef.current[q.id] ?? null,
                    expectedAnswer: null, point: 0, comment: null,
                })),
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    // ── Advance ────────────────────────────────────────────────────────────────

    const advance = () => {
        if (isTransitioning || isSubmitting || result) return;
        const qId = currentQuestion?.id;
        if (qId !== undefined) stopAndTranscribeBg(qId);

        if (currentIndex >= totalQuestions - 1) {
            enterReviewPhase();
            return;
        }

        setIsTransitioning(true);
        setCountdown(TRANSITION_SECS);

        let remaining = TRANSITION_SECS - 1;
        const tick = setInterval(() => {
            setCountdown(remaining);
            remaining -= 1;
            if (remaining < 0) clearInterval(tick);
        }, 1000);

        const done = setTimeout(() => {
            clearInterval(tick);
            setIsTransitioning(false);
            setCurrentIndex(i => i + 1);
        }, TRANSITION_SECS * 1000);

        timersRef.current.push(done);
    }
    
    // Keyboard: Enter → advance
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Enter" && !isSubmitting && !result && phase !== "reviewing") { e.preventDefault(); advance(); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [advance, isSubmitting, result]);

    // Touch: swipe left → advance
    const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const handleTouchEnd   = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        if (touchStartX.current - e.changedTouches[0].clientX > 60) advance();
        touchStartX.current = null;
    };

    // ── Review phase (edit transcribed answers before AI grading) ────────────

    if (phase === "reviewing" && !result) {
        const hasTranscribing = transcribingIds.size > 0;

        return (
            <div className="flex flex-col h-full">
                <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border shrink-0">
                    <PenLine className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <h2 className="text-sm font-semibold truncate">Review Answers</h2>
                    <span className="ml-auto text-[11px] text-muted-foreground shrink-0">{questions.length} Q</span>
                </div>

                {hasTranscribing && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/5 border-b border-yellow-500/20 text-[11px] text-yellow-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Waiting for {transcribingIds.size} transcription{transcribingIds.size > 1 ? "s" : ""}…
                    </div>
                )}

                {/* Monaco editor for Q&A review */}
                <div className="flex-1 min-h-0">
                    <KReviewEditor
                        questions={questions}
                        answers={answers}
                        onAnswersChange={setAnswers}
                    />
                </div>

                <div className="shrink-0 px-3 py-3 border-t border-border flex justify-center">
                    <Button
                        className="gap-1.5 w-full max-w-lg"
                        onClick={handleSubmit}
                        disabled={isSubmitting || hasTranscribing}
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Submit for grading
                    </Button>
                </div>
            </div>
        );
    }

    // ── Result ─────────────────────────────────────────────────────────────────

    if (result) {
        const { totalPoints, maxPoints, pct, grades } = result;
        const scoreColor = pct >= 80 ? "text-green-500" : pct >= 50 ? "text-yellow-500" : "text-red-500";
        const ringColor  = pct >= 80 ? "stroke-green-500" : pct >= 50 ? "stroke-yellow-500" : "stroke-red-500";
        const circ = 2 * Math.PI * 36;
        const dash = (pct / 100) * circ;

        return (
            <div className="flex flex-col h-full overflow-auto">
                <div className="flex flex-col items-center gap-5 px-3 py-6 max-w-lg mx-auto w-full">
                    <div className="relative w-24 h-24">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="7" />
                            <circle cx="40" cy="40" r="36" fill="none" strokeWidth="7" className={ringColor} strokeLinecap="round"
                                strokeDasharray={`${dash} ${circ}`} style={{ transition: "stroke-dasharray 0.8s ease" }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-xl font-bold ${scoreColor}`}>{pct}%</span>
                        </div>
                    </div>
                    <div className="text-center">
                        <h2 className="text-base font-semibold">Results</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">{totalPoints} / {maxPoints} pts</p>
                    </div>
                    <div className="w-full flex flex-col gap-2.5">
                        {grades.map((g, i) => <GradeCard key={g.questionId} index={i + 1} grade={g} />)}
                    </div>
                    <Button onClick={onComplete} className="w-full">Back to tests</Button>
                </div>
            </div>
        );
    }

    // ── Submitting ─────────────────────────────────────────────────────────────

    if (isSubmitting) {
        return (
            <div className="flex flex-col h-full items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    {transcribingIds.size > 0 ? "Finishing transcription…" : "AI grading…"}
                </p>
            </div>
        );
    }

    if (!currentQuestion) return null;

    // ── Question (with inline transition countdown) ───────────────────────────

    const isLast = currentIndex === totalQuestions - 1;

    return (
        <div
            className="flex flex-col h-full bg-background select-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Header — always visible, even during countdown */}
            <div className="shrink-0 px-3 pt-3 pb-2.5 border-b border-border">
                <div className="flex items-center justify-between mb-2 max-w-lg mx-auto">
                    <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        ← Cancel
                    </button>
                    <div className="flex items-center gap-2.5">
                        {transcribingIds.size > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                {transcribingIds.size}
                            </span>
                        )}
                        <span className="text-xs text-muted-foreground">{currentIndex + 1}/{totalQuestions}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 max-w-lg mx-auto">
                    <div className="h-1 rounded-full bg-muted overflow-hidden flex-1">
                        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    {!isTransitioning && (
                        <button
                            onClick={enterReviewPhase}
                            className="flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-700 hover:bg-zinc-600 transition-colors shrink-0 px-2.5 py-1 rounded-md font-medium"
                        >
                            <PenLine className="w-3 h-3" />
                            Preview
                        </button>
                    )}
                </div>
            </div>

            {/* Center content — question or countdown */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6 max-w-lg mx-auto w-full">
                {isTransitioning ? (
                    <>
                        <span className="text-7xl font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.08)" }}>
                            {countdown}
                        </span>
                        <p className="text-sm text-muted-foreground">Next question…</p>
                    </>
                ) : (
                    <>
                        <p className="text-lg font-semibold text-center leading-relaxed">
                            {currentQuestion.question}
                        </p>

                        {/* Recording indicator */}
                        <div className="flex flex-col items-center gap-2">
                            {isRecording ? (
                                <div className="flex items-center gap-2.5 text-destructive">
                                    <span className="relative flex w-3 h-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                                        <span className="relative inline-flex rounded-full w-3 h-3 bg-destructive" />
                                    </span>
                                    <Mic className="w-4 h-4" />
                                    <span className="text-sm font-medium">Recording</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-muted-foreground/30">
                                    <Mic className="w-4 h-4" />
                                    <span className="text-sm">Starting mic…</span>
                                </div>
                            )}

                            {answers[currentQuestion.id] && (
                                <p className="text-xs text-muted-foreground/50 text-center max-w-sm mt-2 italic line-clamp-3">
                                    {answers[currentQuestion.id]}
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Footer — always visible */}
            <div className="shrink-0 px-3 py-4 border-t border-border text-center">
                <p className="text-xs text-muted-foreground/30">
                    {isLast ? "Press Enter to finish" : "Press Enter or swipe left → next"}
                </p>
            </div>
        </div>
    );
}

// ── GradeCard ─────────────────────────────────────────────────────────────────

function GradeCard({ index, grade }: { index: number; grade: KQuestionGrade }) {
    const [showAnswer, setShowAnswer] = useState(false);
    return (
        <div className={`rounded-lg border p-2.5 flex flex-col gap-1.5 text-left ${grade.point >= 4 ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1 min-w-0">{index}. {grade.question}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                    {grade.expectedAnswer && (
                        <button onClick={() => setShowAnswer(v => !v)}
                            className={`transition-colors ${showAnswer ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
                            title="View expected answer">
                            <BookOpen className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {grade.point >= 4
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        : <XCircle className="w-3.5 h-3.5 text-red-500" />
                    }
                    <span className={`text-[11px] font-semibold ${grade.point >= 4 ? "text-green-500" : "text-red-500"}`}>{grade.point}pt</span>
                </div>
            </div>
            {grade.point !== 5 && (
                <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">You: </span>
                    {grade.answerText ? grade.answerText : <span className="italic opacity-50">no answer</span>}
                </div>
            )}
            {grade.comment && (
                <p className="text-xs mt-2 text-right italic text-muted-foreground/70 flex items-start gap-1.5">
                    <KeyRound className="w-3 h-3 shrink-0 mt-0.5 opacity-50" />
                    {grade.comment}
                </p>
            )}
            {showAnswer && grade.expectedAnswer && (
                <div className="text-xs text-primary/80 border-t border-border/30 pt-1.5 mt-0.5">{grade.expectedAnswer}</div>
            )}
        </div>
    );
}
