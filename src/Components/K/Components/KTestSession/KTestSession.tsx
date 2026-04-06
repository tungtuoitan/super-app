import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, ChevronLeft, ChevronRight, BookOpen, KeyRound, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { KTestService } from "../../service/kTest.service";
import { useKTestLoader } from "../../hooks/useKTest.loader";
import type { KTestQuestion, KQuestionGrade, KSubmitAnswersResult } from "../../types/kTest.type";

interface KTestSessionProps {
    knowledgeId: number;
    testId: number;
    questions: KTestQuestion[];
    onComplete: () => void;
    onBack: () => void;
}

type AnswerMap = Record<number, string>; // questionId → answerText

export function KTestSession({ knowledgeId, testId, questions, onComplete, onBack }: KTestSessionProps) {
    const { submitAnswers } = useKTestLoader();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers]           = useState<AnswerMap>({});
    const [isRecording, setIsRecording]   = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult]             = useState<KSubmitAnswersResult | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef        = useRef<Blob[]>([]);
    const textareaRef      = useRef<HTMLTextAreaElement>(null);
    const answersRef       = useRef<AnswerMap>({}); // always-fresh answers, avoids stale closure on submit

    const currentQuestion = questions[currentIndex];
    const currentAnswer   = currentQuestion ? (answers[currentQuestion.id] ?? "") : "";
    const totalQuestions  = questions.length;
    const progress        = totalQuestions > 0 ? Math.round((currentIndex / totalQuestions) * 100) : 0;

    // Keep answersRef in sync so handleSubmit always reads the latest value
    answersRef.current = answers;

    // Auto-focus textarea on question change
    useEffect(() => {
        setTimeout(() => textareaRef.current?.focus(), 50);
    }, [currentIndex]);

    // ── Voice recording ────────────────────────────────────────────────────────

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
                setIsTranscribing(true);
                try {
                    const text = await KTestService._transcribeAudio(audioBlob);
                    if (text.trim()) {
                        setAnswers((prev) => {
                            const qId = currentQuestion.id;
                            const existing = prev[qId] ?? "";
                            return { ...prev, [qId]: existing ? `${existing} ${text.trim()}` : text.trim() };
                        });
                    }
                } catch {
                    // silent fail
                } finally {
                    setIsTranscribing(false);
                }
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
        } catch {
            alert("Cannot access microphone.");
        }
    }, [currentQuestion?.id]);

    const stopRecording = useCallback(() => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    }, []);

    // ── Navigation ─────────────────────────────────────────────────────────────

    const goPrev = useCallback(() => {
        if (currentIndex > 0) setCurrentIndex((i) => i - 1);
    }, [currentIndex]);

    const goNext = useCallback(() => {
        if (currentIndex < totalQuestions - 1) setCurrentIndex((i) => i + 1);
    }, [currentIndex, totalQuestions]);

    const toggleRecording = useCallback(() => {
        if (isRecording) stopRecording();
        else startRecording();
    }, [isRecording, startRecording, stopRecording]);

        const handleSubmit = useCallback(async () => {
        setIsSubmitting(true);
        try {
            const answerPayload = questions.map(q => ({
                questionId: q.id,
                answerText: answersRef.current[q.id]?.trim() || null,
            }));
            const res = await submitAnswers(knowledgeId, testId, { answers: answerPayload });
            setResult(res);
        } catch {
            setResult({
                totalPoints: 0,
                maxPoints: questions.length,
                pct: 0,
                grades: questions.map(q => ({
                    questionId: q.id,
                    question: q.question,
                    answerText: answersRef.current[q.id] ?? null,
                    expectedAnswer: null,
                    point: 0,
                    comment: null,
                })),
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [questions, knowledgeId, testId, submitAnswers]);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (result || isSubmitting) return;
            const inTextarea = document.activeElement === textareaRef.current;

            switch (e.key) {
                case "r":
                case "R":
                    if (!inTextarea) { e.preventDefault(); toggleRecording(); }
                    break;
                case " ":
                    if (!inTextarea) { e.preventDefault(); toggleRecording(); }
                    break;
                case "ArrowLeft":
                case "p":
                case "P":
                    if (!inTextarea) { e.preventDefault(); goPrev(); }
                    break;
                case "ArrowRight":
                case "n":
                case "N":
                    if (!inTextarea) { e.preventDefault(); goNext(); }
                    break;
                case "Enter":
                    if (e.ctrlKey || !inTextarea) {
                        e.preventDefault();
                        if (currentIndex === totalQuestions - 1) handleSubmit();
                        else goNext();
                    }
                    break;
                case "f":
                case "F":
                    if (!inTextarea) { e.preventDefault(); textareaRef.current?.focus(); }
                    break;
                case "Escape":
                    if (inTextarea) { e.preventDefault(); textareaRef.current?.blur(); }
                    break;
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [result, isSubmitting, currentIndex, totalQuestions, toggleRecording, goPrev, goNext, handleSubmit]);



    // ── Result screen ──────────────────────────────────────────────────────────

    if (result) {
        const { totalPoints, maxPoints, pct, grades } = result;
        const scoreColor = pct >= 80 ? "text-green-500" : pct >= 50 ? "text-yellow-500" : "text-red-500";
        const ringColor  = pct >= 80 ? "stroke-green-500" : pct >= 50 ? "stroke-yellow-500" : "stroke-red-500";
        const circumference = 2 * Math.PI * 36;
        const dash = (pct / 100) * circumference;

        return (
            <div className="flex flex-col h-full overflow-auto">
                <div className="flex flex-col items-center gap-6 p-8 max-w-2xl mx-auto w-full">
                    {/* Score ring */}
                    <div className="relative w-28 h-28">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor"
                                className="text-muted/30" strokeWidth="7" />
                            <circle cx="40" cy="40" r="36" fill="none" strokeWidth="7"
                                className={ringColor}
                                strokeLinecap="round"
                                strokeDasharray={`${dash} ${circumference}`}
                                style={{ transition: "stroke-dasharray 0.8s ease" }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-2xl font-bold ${scoreColor}`}>{pct}%</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-lg font-semibold">Results</h2>
                        <p className="text-sm text-muted-foreground mt-1">{totalPoints} / {maxPoints} pts</p>
                    </div>

                    {/* Per-question grades */}
                    <div className="w-full flex flex-col gap-3">
                        {grades.map((g, i) => (
                            <GradeCard key={g.questionId} index={i + 1} grade={g} />
                        ))}
                    </div>

                    <Button onClick={onComplete} className="w-full">Back to test list</Button>
                </div>
            </div>
        );
    }

    if (!currentQuestion) return null;

    const isLastQuestion = currentIndex === totalQuestions - 1;
    const hasCurrentAnswer = !!currentAnswer.trim();

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header / Progress */}
            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        ← Cancel test
                    </button>
                    <span className="text-xs text-muted-foreground">
                        {currentIndex + 1} / {totalQuestions}
                    </span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Question */}
            <div className="flex-1 overflow-auto px-6 py-6 flex flex-col gap-5 max-w-2xl mx-auto w-full">
                {/* Question text */}
                <p className="text-base font-medium leading-relaxed">{currentQuestion.question}</p>

                {/* Answer area */}
                <div className="flex flex-col gap-3">
                    <label className="text-xs text-muted-foreground uppercase tracking-widest">Your answer</label>
                    <textarea
                        ref={textareaRef}
                        value={currentAnswer}
                        onChange={(e) =>
                            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                        }
                        placeholder="Speak or type your answer..."
                        rows={10}
                        className="w-full rounded-lg border border-input bg-muted/30 px-4 py-3 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50"
                    />

                    {/* Voice button */}
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant={isRecording ? "destructive" : "outline"}
                            size="sm"
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isTranscribing}
                            className="gap-2"
                        >
                            {isTranscribing ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Recognising...
                                </>
                            ) : isRecording ? (
                                <>
                                    <MicOff className="w-3.5 h-3.5 animate-pulse" />
                                    Stop recording
                                </>
                            ) : (
                                <>
                                    <Mic className="w-3.5 h-3.5" />
                                    Record
                                </>
                            )}
                        </Button>
                        {isRecording && (
                            <span className="text-xs text-destructive animate-pulse">● Listening...</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer actions */}
            <div className="shrink-0 px-6 py-4 border-t border-border max-w-2xl mx-auto w-full">
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground gap-1.5"
                        onClick={goPrev}
                        disabled={isSubmitting || currentIndex === 0}
                        title="Previous (←)"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Prev
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground gap-1.5"
                        onClick={goNext}
                        disabled={isSubmitting || isLastQuestion}
                        title="Skip (→)"
                    >
                        <XCircle className="w-3.5 h-3.5" />
                        Skip
                    </Button>

                    {isLastQuestion ? (
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="gap-2"
                            title="Submit (Enter)"
                        >
                            {isSubmitting
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />AI grading...</>
                                : "Submit"
                            }
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={goNext}
                            className="gap-2"
                            title="Next (Enter)"
                        >
                            Next
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>

                {/* Keyboard shortcut hints */}
                <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                    {[
                        { key: "R / Space", label: "Record" },
                        { key: "←", label: "Prev" },
                        { key: "→", label: "Skip" },
                        { key: "Enter", label: "Next/Submit" },
                        { key: "F", label: "Focus" },
                        { key: "Esc", label: "Unfocus" },
                    ].map(({ key, label }) => (
                        <span key={key} className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                            <kbd className="px-1 py-0.5 rounded border border-border/40 font-mono text-[9px] bg-muted/30">{key}</kbd>
                            {label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── GradeCard ─────────────────────────────────────────────────────────────────

function GradeCard({ index, grade }: { index: number; grade: KQuestionGrade }) {
    const [showAnswer, setShowAnswer] = useState(false);

    return (
        <div className={`rounded-lg border p-3 flex flex-col gap-2 text-left ${grade.point >= 4 ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium flex-1">{index}. {grade.question}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Expected answer toggle */}
                    {grade.expectedAnswer && (
                        <div className="relative">
                            <button
                                onClick={() => setShowAnswer(v => !v)}
                                className={`transition-colors ${showAnswer ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
                                title="View expected answer"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                    {grade.point >= 4
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <XCircle className="w-4 h-4 text-red-500" />
                    }
                    <span className={`text-xs font-semibold ${grade.point >= 4 ? "text-green-500" : "text-red-500"}`}>
                        {grade.point} pt
                    </span>
                </div>
            </div>


            {/* User's answer — shown when not perfect */}
            {grade.point !== 5 && (
                <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">You: </span>
                    {grade.answerText
                        ? grade.answerText
                        : <span className="italic opacity-50">no answer</span>
                    }
                </div>
            )}
            {/* AI comment — replaces raw answer display */}
            {grade.comment && (
                <p className="text-xs mt-4 text-right italic text-muted-foreground/70 flex items-start gap-1.5">
                    <KeyRound className="w-3 h-3 shrink-0 mt-0.5 opacity-50" />
                    {grade.comment}
                </p>
            )}

            {/* Expected answer — revealed on icon click */}
            {showAnswer && grade.expectedAnswer && (
                <div className="text-xs text-primary/80 border-t border-border/30 pt-2 mt-0.5">
                    {grade.expectedAnswer}
                </div>
            )}
        </div>
    );
}
