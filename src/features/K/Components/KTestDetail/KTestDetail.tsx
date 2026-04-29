import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, Pencil, Play, Plus, X } from "lucide-react";
import { Button } from "@/shared";
import { useKTestLoader } from "../../hooks/test/useKTest.loader";
import type { KTestDetail as KTestDetailType, KTestQuestion } from "../../types/kTest.type";

interface KTestDetailProps {
    knowledgeId: number;
    testId: number;
    onBack: () => void;
    onStart: (detail: KTestDetailType) => void;
}

export function KTestDetail({ knowledgeId, testId, onBack, onStart }: KTestDetailProps) {
    const { loadTestDetail, updateTest, updateQuestions } = useKTestLoader();
    const [detail, setDetail]       = useState<KTestDetailType | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Inline title editing
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft]     = useState("");
    const [isSavingTitle, setIsSavingTitle] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Toggling isActive
    const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

    // Adding questions
    const [showAddForm, setShowAddForm] = useState(false);

    const reload = () => {
        setIsLoading(true);
        loadTestDetail(knowledgeId, testId)
            .then(d => setDetail(d ?? null))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => { reload(); }, [knowledgeId, testId]);

    useEffect(() => {
        if (editingTitle && titleInputRef.current) titleInputRef.current.focus();
    }, [editingTitle]);

    // ── Title edit ─────────────────────────────────────────────────────────────

    const startEditTitle = () => {
        if (!detail) return;
        setTitleDraft(detail.title);
        setEditingTitle(true);
    };

    const cancelEditTitle = () => {
        setEditingTitle(false);
        setTitleDraft("");
    };

    const saveTitle = async () => {
        if (!detail || !titleDraft.trim() || isSavingTitle) return;
        setIsSavingTitle(true);
        try {
            await updateTest(knowledgeId, testId, { title: titleDraft.trim() });
            setDetail(prev => prev ? { ...prev, title: titleDraft.trim() } : prev);
            setEditingTitle(false);
        } catch {
            // keep dialog open
        } finally {
            setIsSavingTitle(false);
        }
    };

    // ── Toggle isActive ────────────────────────────────────────────────────────

    const handleToggle = async (q: KTestQuestion) => {
        if (togglingIds.has(q.id)) return;

        // Optimistic update
        setDetail(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                questions: prev.questions.map(x =>
                    x.id === q.id ? { ...x, isActive: !x.isActive } : x
                ),
            };
        });
        setTogglingIds(prev => new Set(prev).add(q.id));

        try {
            await updateQuestions(knowledgeId, testId, {
                addQuestions: [], updateQuestions: [],
                toggleQuestionIds: [q.id],
                deleteQuestionIds: [], restoreQuestionIds: [],
            });
        } catch {
            // Revert on failure
            setDetail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    questions: prev.questions.map(x =>
                        x.id === q.id ? { ...x, isActive: !x.isActive } : x
                    ),
                };
            });
        } finally {
            setTogglingIds(prev => { const s = new Set(prev); s.delete(q.id); return s; });
        }
    };

    // ── Delete question ───────────────────────────────────────────────────────

    const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

    const handleDelete = async (q: KTestQuestion) => {
        if (deletingIds.has(q.id)) return;

        // Optimistic remove
        setDetail(prev => prev
            ? { ...prev, questions: prev.questions.filter(x => x.id !== q.id) }
            : prev
        );
        setDeletingIds(prev => new Set(prev).add(q.id));

        try {
            await updateQuestions(knowledgeId, testId, {
                addQuestions: [], updateQuestions: [],
                toggleQuestionIds: [],
                deleteQuestionIds: [q.id], restoreQuestionIds: [],
            });
        } catch {
            reload();
        } finally {
            setDeletingIds(prev => { const s = new Set(prev); s.delete(q.id); return s; });
        }
    };

    // ── Add question inline ──────────────────────────────────────────────────

    const handleAddQuestion = async (name: string, description: string) => {
        try {
            await updateQuestions(knowledgeId, testId, {
                addQuestions: [{ name, description: description || null }],
                updateQuestions: [], toggleQuestionIds: [],
                deleteQuestionIds: [], restoreQuestionIds: [],
            });
            reload();
        } catch {
            // silent fail
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-40">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }
    if (!detail) return null;

    const levelLabel: Record<number, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };
    const levelClass: Record<number, string> = {
        1: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        3: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };

    const activeCount = detail.questions.filter(q => q.isActive).length;

    return (
        <div className="flex flex-col gap-4 p-4 w-full">
            {/* Header */}
            <div className="flex items-start gap-3">
                <button onClick={onBack} className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 min-w-0">
                    {editingTitle ? (
                        <div className="flex items-center gap-1.5">
                            <input
                                ref={titleInputRef}
                                value={titleDraft}
                                onChange={e => setTitleDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") cancelEditTitle(); }}
                                disabled={isSavingTitle}
                                className="flex-1 text-sm font-semibold bg-transparent border-b border-primary outline-none py-0.5"
                                maxLength={500}
                            />
                            <button onClick={saveTitle} disabled={isSavingTitle || !titleDraft.trim()} className="text-green-500 hover:text-green-400 disabled:opacity-40">
                                {isSavingTitle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={cancelEditTitle} disabled={isSavingTitle} className="text-muted-foreground hover:text-foreground">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 group/title">
                            <h2 className="text-sm font-semibold truncate">{detail.title}</h2>
                            <button
                                onClick={startEditTitle}
                                className="opacity-0 group-hover/title:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${levelClass[detail.level] ?? levelClass[1]}`}>
                            {levelLabel[detail.level] ?? "Easy"}
                        </span>
                        <p className="text-xs text-muted-foreground">
                            {activeCount} active
                        </p>
                    </div>
                </div>

                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-7 text-xs shrink-0"
                    onClick={() => setShowAddForm(true)}
                >
                    <Plus className="w-3 h-3" />
                    Add
                </Button>
                <Button
                    size="sm"
                    className="gap-1.5 h-7 text-xs shrink-0"
                    disabled={activeCount === 0}
                    onClick={() => onStart({
                        ...detail,
                        questions: detail.questions.filter(q => q.isActive && !q.deletedAt),
                    })}
                >
                    <Play className="w-3 h-3" />
                </Button>
            </div>

            {/* Add question form */}
            {showAddForm && (
                <AddQuestionForm
                    onAdd={async (name, desc) => { await handleAddQuestion(name, desc); setShowAddForm(false); }}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {/* Question list */}
            <div className="grid grid-cols-2 gap-2 rounded-lg">
                {detail.questions.map((q, i) => (
                    <QuestionRow
                        key={q.id}
                        index={i}
                        question={q}
                        isToggling={togglingIds.has(q.id)}
                        isDeleting={deletingIds.has(q.id)}
                        onToggle={() => handleToggle(q)}
                        onDelete={() => handleDelete(q)}
                    />
                ))}
                {detail.questions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-10 col-span-2">
                        No questions in this test yet.
                    </p>
                )}
            </div>
        </div>
    );
}

// ── AddQuestionForm ──────────────────────────────────────────────────────────

function AddQuestionForm({ onAdd, onCancel }: { onAdd: (name: string, desc: string) => Promise<void>; onCancel: () => void }) {
    const [name, setName]     = useState("");
    const [desc, setDesc]     = useState("");
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 30); }, []);

    const handleSubmit = async () => {
        if (!name.trim() || saving) return;
        setSaving(true);
        try { await onAdd(name.trim(), desc.trim()); }
        finally { setSaving(false); }
    };

    return (
        <div className="rounded-lg border border-primary/40 bg-card p-3 flex flex-col gap-2">
            <input
                ref={inputRef}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onCancel(); }}
                placeholder="Question…"
                disabled={saving}
                className="text-sm bg-transparent border-b border-border outline-none py-0.5"
            />
            <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Answer (optional)"
                disabled={saving}
                rows={2}
                className="text-xs bg-transparent border border-border rounded p-1.5 outline-none resize-none text-muted-foreground"
            />
            <div className="flex items-center gap-1.5 justify-end">
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onCancel} disabled={saving}>Cancel</Button>
                <Button size="sm" className="h-6 text-xs" onClick={handleSubmit} disabled={saving || !name.trim()}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                </Button>
            </div>
        </div>
    );
}

// ── QuestionRow ──────────────────────────────────────────────────────────────

interface QuestionRowProps {
    index: number;
    question: KTestQuestion;
    isToggling: boolean;
    isDeleting: boolean;
    onToggle: () => void;
    onDelete: () => void;
}

function QuestionRow({ index, question, isToggling, isDeleting, onToggle, onDelete }: QuestionRowProps) {
    return (
        <div className={`group/row rounded-lg border bg-card p-3 flex gap-2 transition-opacity ${question.isActive ? "border-border" : "border-border/50 opacity-50"}`}>
            {/* isActive toggle */}
            <div>
                <button
                    onClick={onToggle}
                    disabled={isToggling || isDeleting}
                    title={question.isActive ? "Disable this question" : "Enable this question"}
                    className="mt-[-5px] shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                >
                    {isToggling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors ${
                            question.isActive
                                ? "bg-white/50 border-white/0"
                                : "border-muted-foreground border-white/30"
                        }`}>
                            {question.isActive && <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />}
                        </div>
                    )}
                </button>
            </div>

            <span className="text-xs text-muted-foreground shrink-0 mt-0.5 w-5 text-right">{index + 1}.</span>

            <div className="flex-1 min-w-0 flex flex-col gap-1 text-left">
                <p className="text-sm leading-relaxed text-white">{question.question}</p>
                {question.answer && (
                    <p className="text-xs text-muted-foreground/30 leading-relaxed">{question.answer}</p>
                )}
                {question.scoreHistory.length > 0 && (
                    <QuestionScoreDots scores={question.scoreHistory} />
                )}
            </div>

            <button
                onClick={onDelete}
                disabled={isDeleting || isToggling}
                title="Remove from test"
                className="shrink-0 self-start mt-[-2px] opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-destructive disabled:opacity-40"
            >
                {isDeleting
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <X className="w-3.5 h-3.5" />
                }
            </button>
        </div>
    );
}

// ── QuestionScoreDots ────────────────────────────────────────────────────────

function QuestionScoreDots({ scores }: { scores: number[] }) {
    const MAX_SCORE = 5;
    const SLOTS     = 10;
    const slots: (number | null)[] = [
        ...Array(Math.max(0, SLOTS - scores.length)).fill(null),
        ...scores.slice(-SLOTS),
    ];

    const segColor = (pt: number) => {
        if (pt >= 4) return "#22c55e";
        if (pt >= 3) return "#84cc16";
        if (pt >= 2) return "#eab308";
        if (pt >= 1) return "#f97316";
        return "#ef4444";
    };

    return (
        <div className="flex items-end gap-[3px] mt-1" title="Score history (oldest → newest, 0–5 pts)">
            {slots.map((pt, i) => {
                if (pt === null) {
                    return <div key={i} className="w-3 rounded-sm bg-white/5" style={{ height: 12 }} />;
                }
                const fillH = Math.max(2, Math.round((pt / MAX_SCORE) * 12));
                return (
                    <div key={i} className="w-3 rounded-sm bg-white/5 flex items-end overflow-hidden" style={{ height: 12 }} title={`${pt}/5`}>
                        <div className="w-full rounded-sm" style={{ height: fillH, backgroundColor: segColor(pt), opacity: 0.85 }} />
                    </div>
                );
            })}
        </div>
    );
}
