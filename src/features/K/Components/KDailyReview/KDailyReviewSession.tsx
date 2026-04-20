import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, Mic, MicOff, ChevronRight, Loader2, CheckCircle2, XCircle, Type, KeyRound, Send, PenLine, Check } from "lucide-react";
import { KReviewEditor } from "../small/KReviewEditor";
import { Button } from "@/shared/components/ui/Button";
import { KTestService } from "../../service/kTest.service";
import { AutoResizeTextarea } from "../KNodeEditorPanel/AutoResizeTextarea";
import { useGlobalShortcut } from "@/shared/hooks/useGlobalShortcut";
import { useConsoleHelper } from "@/shell/hooks/useConsole.helper";
import type { KDailySessionQuestion, KDailyAnswerItem, KSubmitAnswersResult, KQuestionGrade } from "../../types/kTest.type";

interface KDailyReviewSessionProps {
    knowledgeId: number;
    testId: number;
    testTitle: string;
    questions: KDailySessionQuestion[];
    onComplete: () => void;
    onBack: () => void;
}

type AnswerMap = Record<number, string>;
type Mode = "record" | "text";
type Phase = "answering" | "reviewing";

const TRANSITION_SECS = 2;

export function KDailyReviewSession({ knowledgeId, testId, testTitle, questions, onComplete, onBack }: KDailyReviewSessionProps) {
    const _console = useConsoleHelper();
    const [mode, setMode]                   = useState<Mode>("record");
    const [phase, setPhase]                 = useState<Phase>("answering");
    const [currentIndex, setCurrentIndex]   = useState(0);
    const [answers, setAnswers]             = useState<AnswerMap>({});
    const [timings, setTimings]             = useState<Record<number, number>>({});
    const [isRecording, setIsRecording]     = useState(false);
    const [transcribingIds, setTranscribingIds] = useState<Set<number>>(new Set());
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [countdown, setCountdown]         = useState(0);
    const [isSubmitting, setIsSubmitting]   = useState(false);
    const [result, setResult]               = useState<KSubmitAnswersResult | null>(null);
    const [editingGradeId, setEditingGradeId] = useState<number | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef        = useRef<Blob[]>([]);
    const streamRef        = useRef<MediaStream | null>(null);
    const answersRef       = useRef<AnswerMap>({});
    const textareaRef      = useRef<HTMLTextAreaElement>(null);
    const questionStartRef = useRef<number>(Date.now());
    const touchStartX      = useRef<number | null>(null);
    const timersRef        = useRef<ReturnType<typeof setTimeout>[]>([]);

    answersRef.current = answers;

    const totalQuestions  = questions.length;
    const currentQuestion = questions[currentIndex];
    const progress        = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;

    // Track time spent on each question
    useEffect(() => {
        questionStartRef.current = Date.now();
        if (mode === "text") {
            setTimeout(() => textareaRef.current?.focus(), 50);
        }
    }, [currentIndex, mode]);

    const recordTiming = useCallback(() => {
        if (!currentQuestion) return;
        const elapsed = Date.now() - questionStartRef.current;
        setTimings(prev => ({ ...prev, [currentQuestion.id]: (prev[currentQuestion.id] ?? 0) + elapsed }));
    }, [currentQuestion]);

    // ── Recording helpers (same pattern as KTestRecordSession) ─────────────

    const stopAndTranscribeBg = useCallback((qId: number) => {
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
    }, []);

    // Stop recording and discard audio (no transcription) — used when entering review phase manually
    const stopRecordingOnly = useCallback(() => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === "inactive") { mediaRecorderRef.current = null; return; }
        mediaRecorderRef.current = null;
        recorder.onstop = () => {
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            chunksRef.current = [];
        };
        recorder.stop();
        setIsRecording(false);
    }, []);

    const startRecording = useCallback(async () => {
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
    }, []);

    // Auto-start recording on each new question (record mode, answering phase only)
    useEffect(() => {
        if (phase === "answering" && mode === "record" && !isTransitioning && currentQuestion && !result && !isSubmitting) {
            startRecording();
        }
    }, [currentIndex, isTransitioning, result, isSubmitting, mode, phase]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            timersRef.current.forEach(clearTimeout);
            const rec = mediaRecorderRef.current;
            if (rec && rec.state !== "inactive") { rec.onstop = null; rec.stop(); }
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, []);

    // ── Mode switch ───────────────────────────────────────────────────────────

    const switchToTextMode = useCallback(() => {
        if (currentQuestion) stopAndTranscribeBg(currentQuestion.id);
        setMode("text");
    }, [currentQuestion, stopAndTranscribeBg]);

    const switchToRecordMode = useCallback(() => {
        setMode("record");
    }, []);

    // Manual toggle for text mode
    const toggleRecording = useCallback(() => {
        if (isRecording) {
            if (currentQuestion) stopAndTranscribeBg(currentQuestion.id);
        } else {
            startRecording();
        }
    }, [isRecording, currentQuestion, stopAndTranscribeBg, startRecording]);

    // ── Enter review phase ──────────────────────────────────────────────────────

    const enterReviewPhase = useCallback(() => {
        recordTiming();
        if (isRecording) stopRecordingOnly();
        setPhase("reviewing");
    }, [recordTiming, isRecording, stopRecordingOnly]);

    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleSubmit = useCallback(async () => {
        setIsSubmitting(true);
        // Give background transcriptions a brief chance to land
        await new Promise(r => { const t = setTimeout(r, 800); timersRef.current.push(t); });
        const dailyAnswers: KDailyAnswerItem[] = questions.map(q => ({
            questionId: q.id,
            answerText: answersRef.current[q.id]?.trim() || null,
            responseTimeMs: timings[q.id] ?? null,
        }));

        console.log("[KGrading] model: backend | payload:", dailyAnswers);

        try {
            const res = await KTestService._submitDailyAnswers(knowledgeId, testId, { answers: dailyAnswers });
            if (res.success && res.object) {
                console.log("[KGrading] result:", res.object);
                setResult(res.object);
            } else {
                throw new Error("No grading result");
            }
        } catch (err) {
            console.error("[KGrading] failed:", err);
            _console.error("Grading failed — please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }, [questions, knowledgeId, testId, timings, _console]);

    // ── Advance ────────────────────────────────────────────────────────────────

    const advance = useCallback(() => {
        if (isTransitioning || isSubmitting || result) return;
        recordTiming();
        const qId = currentQuestion?.id;

        if (mode === "record") {
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
        } else {
            // text mode: just go next
            if (currentIndex >= totalQuestions - 1) {
                handleSubmit();
                return;
            }
            setCurrentIndex(i => i + 1);
        }
    }, [isTransitioning, isSubmitting, result, currentQuestion, currentIndex, totalQuestions, mode, stopAndTranscribeBg, enterReviewPhase, handleSubmit, recordTiming]);

    // Keyboard: Enter → advance (record mode), Ctrl+Enter → advance (text mode)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (isSubmitting || result || phase === "reviewing") return;
            if (mode === "record" && e.key === "Enter") { e.preventDefault(); advance(); }
            if (mode === "text" && e.key === "Enter" && e.ctrlKey) { e.preventDefault(); advance(); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [advance, isSubmitting, result, mode]);

    // Ctrl+Shift+Enter → submit for grading (reviewing phase)
    useGlobalShortcut("ctrl+shift+enter", { id: "kdaily-submit-grading", enabled: phase === "reviewing" && !isSubmitting && !result }, () => {
        handleSubmit();
        return true;
    });

    // Touch: swipe left → advance (record mode)
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
                {/* Header */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-zinc-800/60 shrink-0">
                    <PenLine className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <h2 className="text-sm font-semibold truncate">{testTitle} — Review</h2>
                    <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                        {questions.length} Q
                    </span>
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

                {/* Footer */}
                <div className="shrink-0 px-3 py-3 border-t border-zinc-800/60 flex flex-col items-center gap-1">
                    <Button
                        className="gap-1.5 w-full max-w-lg"
                        onClick={handleSubmit}
                        disabled={isSubmitting || hasTranscribing}
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Submit for grading
                    </Button>
                    <span className="text-[10px] text-muted-foreground/30">Ctrl+Shift+Enter</span>
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
            <div className="flex flex-col h-full overflow-auto ">
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
                        <h2 className="text-base font-semibold">{testTitle} — Results</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">{totalPoints} / {maxPoints} pts</p>
                    </div>
                    <div className="w-full flex flex-col gap-2.5">
                        {grades.map((g, i) => <GradeCard key={g.questionId} index={i + 1} grade={g} knowledgeId={knowledgeId} testId={testId} editingGradeId={editingGradeId} onSetEditing={setEditingGradeId} />)}
                    </div>
                    <Button onClick={onComplete} className="w-full">Done</Button>
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

    // ── Transition (record mode) ──────────────────────────────────────────────

    if (isTransitioning) {
        return (
            <div className="flex flex-col h-full items-center justify-center gap-3 select-none">
                <span className="text-8xl font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.08)" }}>
                    {countdown}
                </span>
                <p className="text-sm text-muted-foreground">Next question…</p>
                {transcribingIds.size > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 mt-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Transcribing in background
                    </div>
                )}
            </div>
        );
    }

    if (!currentQuestion) return null;

    const isLast = currentIndex === totalQuestions - 1;

    // ── Record Mode UI ────────────────────────────────────────────────────────

    if (mode === "record") {
        return (
            <div
                className="flex flex-col h-full bg-background select-none h-full w-full"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Header */}
                <div className="shrink-0 px-3 pt-3 pb-2.5 border-b border-border w-full">
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="w-4 h-4 inline mr-1" />
                            Cancel
                        </button>
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={switchToTextMode}
                                className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                                title="Switch to text mode"
                            >
                                <Type className="w-3 h-3" />
                                Text
                            </button>
                            {transcribingIds.size > 0 && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    {transcribingIds.size}
                                </span>
                            )}
                            <span className="text-xs text-muted-foreground">{currentIndex + 1}/{totalQuestions}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mx-auto">
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

                {/* Question — centered */}
                <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6 max-w-lg mx-auto w-full">
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

                        {/* Live partial transcript */}
                        {answers[currentQuestion.id] && (
                            <p className="text-xs text-muted-foreground/50 text-center max-w-sm mt-2 italic line-clamp-3">
                                {answers[currentQuestion.id]}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer hint */}
                <div className="shrink-0 px-3 py-4 border-t border-border text-center">
                    <p className="text-xs text-muted-foreground/30">
                        {isLast ? "Press Enter to finish" : "Press Enter or swipe left → next"}
                    </p>
                </div>
            </div>
        );
    }

    // ── Text Mode UI ──────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-zinc-800/60 shrink-0">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm font-semibold truncate">{testTitle}</h2>
                <div className="flex items-center gap-2.5 ml-auto shrink-0">
                    <button
                        onClick={switchToRecordMode}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        title="Switch to record mode"
                    >
                        <Mic className="w-3 h-3" />
                        Record
                    </button>
                    <span className="text-xs text-muted-foreground">
                        {currentIndex + 1}/{totalQuestions}
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-zinc-800">
                <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Question area */}
            <div className="flex-1 flex flex-col items-center justify-center px-3 py-4 gap-4 max-w-lg mx-auto w-full">
                <div className="text-center">
                    <p className="text-base font-medium">{currentQuestion.question}</p>
                </div>

                <textarea
                    ref={textareaRef}
                    value={answers[currentQuestion.id] ?? ""}
                    onChange={e => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                    placeholder="Type your answer..."
                    disabled={isSubmitting}
                    rows={4}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm outline-none focus:border-zinc-500 resize-none"
                />

                <div className="flex items-center gap-2.5 w-full">
                    {/* Optional: record button in text mode too */}
                    <Button
                        size="sm"
                        variant={isRecording ? "destructive" : "outline"}
                        className="gap-1 h-8 flex-1"
                        onClick={toggleRecording}
                        disabled={transcribingIds.size > 0 || isSubmitting}
                    >
                        {transcribingIds.size > 0 ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isRecording ? (
                            <MicOff className="w-3.5 h-3.5" />
                        ) : (
                            <Mic className="w-3.5 h-3.5" />
                        )}
                        {isRecording ? "Stop" : "Record"}
                    </Button>

                    {isLast ? (
                        <Button
                            className="gap-1 h-8 flex-1"
                            onClick={handleSubmit}
                            disabled={isSubmitting || isRecording || transcribingIds.size > 0}
                        >
                            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Submit
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            className="gap-1 h-8 flex-1"
                            onClick={advance}
                            disabled={isRecording || transcribingIds.size > 0}
                        >
                            Next
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>

                <p className="text-[10px] text-muted-foreground/30">Ctrl+Enter → {isLast ? "submit" : "next"}</p>
            </div>
        </div>
    );
}

// ── GradeCard ──────────────────────────────────────────────────────────────

function GradeCard({ index, grade, knowledgeId, testId, editingGradeId, onSetEditing }: { index: number; grade: KQuestionGrade; knowledgeId: number; testId: number; editingGradeId: number | null; onSetEditing: (id: number | null) => void }) {
    const isEditing = editingGradeId === grade.questionId;
    const [answerDraft, setAnswerDraft]     = useState(grade.expectedAnswer ?? "");
    const [displayAnswer, setDisplayAnswer] = useState(grade.expectedAnswer ?? "");
    const [saving, setSaving]               = useState(false);

    const handleSaveAnswer = async () => {
        if (saving) return;
        setSaving(true);
        const trimmed = answerDraft.trim();
        setDisplayAnswer(trimmed);   // optimistic
        onSetEditing(null);
        try {
            await KTestService._updateQuestions(knowledgeId, testId, {
                addQuestions: [],
                updateQuestions: [{ id: grade.questionId, name: grade.question, description: trimmed || null }],
                toggleQuestionIds: [],
                deleteQuestionIds: [],
                restoreQuestionIds: [],
            });
        } catch {
            setDisplayAnswer(grade.expectedAnswer ?? ""); // rollback
        } finally { setSaving(false); }
    };

    const handleStartEdit = () => { setAnswerDraft(displayAnswer); onSetEditing(grade.questionId); };
    const handleCancel    = () => { onSetEditing(null); setAnswerDraft(displayAnswer); };

    useGlobalShortcut("ctrl+s", { id: `grade-card-save-${grade.questionId}`, priority: 90, enabled: isEditing && !saving }, () => {
        handleSaveAnswer();
        return true;
    });

    const isCorrect = grade.point >= 4;

    return (
        <div className={`rounded-lg border p-2.5 flex flex-col gap-2 text-left ${isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>

            {/* Question + score */}
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1 min-w-0 whitespace-pre-wrap">{index}. {grade.question}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                    {isCorrect
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        : <XCircle className="w-3.5 h-3.5 text-red-500" />
                    }
                    <span className={`text-[11px] font-semibold ${isCorrect ? "text-green-500" : "text-red-500"}`}>{grade.point}pt</span>
                </div>
            </div>

            {/* User's answer */}
            {grade.answerText ? (
                <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/50">You: </span>
                    <span className="whitespace-pre-wrap">{grade.answerText}</span>
                </div>
            ) : (
                <p className="text-xs italic text-muted-foreground/40">No answer</p>
            )}

            {/* AI comment */}
            {grade.comment && (
                isCorrect ? (
                    <p className="text-xs italic text-muted-foreground/60 flex items-start gap-1.5">
                        <KeyRound className="w-3 h-3 shrink-0 mt-0.5 opacity-50" />
                        {grade.comment}
                    </p>
                ) : (
                    <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5">
                        <p className="text-[13px] font-medium text-amber-400 leading-relaxed">{grade.comment}</p>
                    </div>
                )
            )}

            {/* Expected answer — always visible, double-click to edit */}
            <div className="border-t border-border/30 pt-2 mt-0.5">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wide">Expected</span>
                    {isEditing && (
                        <div className="flex items-center gap-1.5">
                            {saving
                                ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/40" />
                                : <button onClick={handleSaveAnswer} className="text-green-500 hover:text-green-400">
                                    <Check className="w-3 h-3" />
                                </button>
                            }
                            <button onClick={handleCancel} className="text-muted-foreground/40 hover:text-muted-foreground">
                                <XCircle className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
                {isEditing ? (
                    <AutoResizeTextarea
                        value={answerDraft}
                        onChange={setAnswerDraft}
                        placeholder="Expected answer…"
                        className="text-xs text-primary/80 w-full"
                        onKeyDown={e => { if (e.key === "Escape") handleCancel(); }}
                    />
                ) : (
                    <p
                        className="text-xs text-primary/80 whitespace-pre-wrap cursor-text"
                        onDoubleClick={handleStartEdit}
                        title="Double-click to edit"
                    >
                        {displayAnswer || <span className="italic text-muted-foreground/30">No expected answer</span>}
                    </p>
                )}
            </div>
        </div>
    );
}
