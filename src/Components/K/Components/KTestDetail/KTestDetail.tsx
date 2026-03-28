import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, Pencil, Play, Plus, X } from "lucide-react";
import { useDrop } from "react-dnd";
import { Button } from "@/Components/ui/button";
import { useKTestLoader } from "../../hooks/useKTest.loader";
import { useKStore } from "../../store/K.store";
import { kTestDrag } from "./kTestDrag";
import type { KTestDetail as KTestDetailType, KTestQuestion } from "../../types/kTest.type";

interface KTestDetailProps {
    knowledgeId: number;
    testId: number;
    nodeMap: Record<number, string>;  // nodeId → entity node name
    onBack: () => void;
    onStart: (detail: KTestDetailType) => void;
}

export function KTestDetail({ knowledgeId, testId, nodeMap, onBack, onStart }: KTestDetailProps) {
    const { loadTestDetail, updateTest, updateTestNodes } = useKTestLoader();
    const { selectedItemIds, currentK } = useKStore();
    const [detail, setDetail]       = useState<KTestDetailType | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Inline title editing
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft]     = useState("");
    const [isSavingTitle, setIsSavingTitle] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Toggling isActive
    const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

    // Adding nodes from tree selection or drag-drop
    const [isAddingNodes, setIsAddingNodes] = useState(false);

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
        if (togglingIds.has(q.testNodeId)) return;

        // Optimistic update
        setDetail(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                questions: prev.questions.map(x =>
                    x.testNodeId === q.testNodeId ? { ...x, isActive: !x.isActive } : x
                ),
            };
        });
        setTogglingIds(prev => new Set(prev).add(q.testNodeId));

        try {
            await updateTestNodes(knowledgeId, testId, {
                addNodeIds: [],
                toggleTestNodeIds: [q.testNodeId],
                deleteTestNodeIds: [],
            });
        } catch {
            // Revert on failure
            setDetail(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    questions: prev.questions.map(x =>
                        x.testNodeId === q.testNodeId ? { ...x, isActive: !x.isActive } : x
                    ),
                };
            });
        } finally {
            setTogglingIds(prev => { const s = new Set(prev); s.delete(q.testNodeId); return s; });
        }
    };

    // ── Delete question from test ──────────────────────────────────────────────

    const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

    const handleDelete = async (q: KTestQuestion) => {
        if (deletingIds.has(q.testNodeId)) return;

        // Optimistic remove
        setDetail(prev => prev
            ? { ...prev, questions: prev.questions.filter(x => x.testNodeId !== q.testNodeId) }
            : prev
        );
        setDeletingIds(prev => new Set(prev).add(q.testNodeId));

        try {
            await updateTestNodes(knowledgeId, testId, {
                addNodeIds: [],
                toggleTestNodeIds: [],
                deleteTestNodeIds: [q.testNodeId],
            });
        } catch {
            // Revert on failure
            reload();
        } finally {
            setDeletingIds(prev => { const s = new Set(prev); s.delete(q.testNodeId); return s; });
        }
    };

    // ── Add from tree selection / drag-drop ───────────────────────────────────

    // Resolve { newIds, dupCount } from any list of selected/dragged node IDs.
    // entity nodes → all question descendants; question nodes → direct.
    // newIds = not yet in this test; dupCount = how many questions already exist.
    // Inactive (deleted) nodes are always excluded.
    const resolveQuestions = (sourceIds: number[]) => {
        if (!sourceIds.length || !currentK?.flatData || !detail) return { newIds: [], dupCount: 0 };
        const existing = new Set(detail.questions.map(q => q.nodeId));
        const allResolved = new Set<number>();

        for (const selId of sourceIds) {
            const node = currentK.flatData.find(n => n.id === selId);
            if (!node || node.deletedAt) continue;   // skip deleted source

            if (node.nodeType === "question") {
                allResolved.add(node.id);
            } else {
                currentK.flatData.forEach(n => {
                    if (n.nodeType === "question" && !n.deletedAt && n.pathIds.includes(`/${selId}/`))
                        allResolved.add(n.id);
                });
            }
        }

        const newIds   = Array.from(allResolved).filter(id => !existing.has(id));
        const dupCount = allResolved.size - newIds.length;
        return { newIds, dupCount };
    };

    // For the "Add N" button — driven by tree selection (ctrl+click)
    const { newIds: addableNodeIds, dupCount: selectionDupCount } = useMemo(
        () => resolveQuestions(selectedItemIds),
        [selectedItemIds, currentK?.flatData, detail],
    );

    const doAdd = async (nodeIds: number[]) => {
        if (!nodeIds.length || isAddingNodes) return;
        setIsAddingNodes(true);
        try {
            await updateTestNodes(knowledgeId, testId, {
                addNodeIds: nodeIds,
                toggleTestNodeIds: [],
                deleteTestNodeIds: [],
            });
            reload();
        } catch {
            // silent fail
        } finally {
            setIsAddingNodes(false);
        }
    };

    const handleAddFromSelection = () => doAdd(addableNodeIds);

    // ── react-dnd drop target (same DnD system as react-arborist) ────────────
    const resolveRef = useRef(resolveQuestions);
    resolveRef.current = resolveQuestions;

    const [{ isDragOver }, dropRef] = useDrop({
        accept: "NODE",
        drop: () => {
            const { newIds } = resolveRef.current(kTestDrag.get());
            kTestDrag.clear();
            doAdd(newIds);
        },
        collect: (monitor) => ({
            isDragOver: monitor.isOver({ shallow: true }),
        }),
    });

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
        <div className="flex flex-col gap-4 p-4 w-full ">
            {/* Header */}
            <div className="flex items-start gap-3">
                <button onClick={onBack} className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 min-w-0">
                    {/* Editable title */}
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

                {addableNodeIds.length > 0 && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-xs shrink-0"
                        onClick={handleAddFromSelection}
                        disabled={isAddingNodes}
                        title={selectionDupCount > 0
                            ? `${addableNodeIds.length} new · ${selectionDupCount} already in test`
                            : `Add ${addableNodeIds.length} question(s) from selection`}
                    >
                        {isAddingNodes
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Plus className="w-3 h-3" />
                        }
                        Add {addableNodeIds.length}
                        {selectionDupCount > 0 && (
                            <span className="ml-0.5 text-muted-foreground">({selectionDupCount} dup)</span>
                        )}
                    </Button>
                )}
                <Button
                    size="sm"
                    className="gap-1.5 h-7 text-xs shrink-0"
                    disabled={activeCount === 0}
                    onClick={() => onStart({
                        ...detail,
                        questions: detail.questions.filter(q => q.isActive),
                    })}
                >
                    <Play className="w-3 h-3" />
                </Button>
            </div>

            {/* Question list — react-dnd drop target for tree nodes */}
            <div
                ref={dropRef}
                className={`relative grid grid-cols-2 gap-2 rounded-lg transition-colors ${
                    isDragOver ? "outline outline-2 outline-primary/60 outline-dashed bg-primary/5" : ""
                }`}
            >
                {/* Drop overlay — computed from kTestDrag module-level store */}
                {isDragOver && (() => {
                    const { newIds: dn, dupCount: dd } = resolveQuestions(kTestDrag.get());
                    return (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none rounded-lg">
                            <div className="bg-background/90 border border-primary/40 rounded-lg px-4 py-2 text-center shadow-lg">
                                {dn.length > 0 ? (
                                    <>
                                        <p className="text-sm font-medium text-primary">
                                            + {dn.length} question{dn.length !== 1 ? "s" : ""}
                                        </p>
                                        {dd > 0 && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {dd} already in test — will be skipped
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        {dd > 0 ? "All questions already in test" : "No questions found in dragged nodes"}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {detail.questions.map((q, i) => (
                    <QuestionRow
                        key={q.testNodeId}
                        index={i}
                        question={q}
                        entityName={nodeMap[q.nodeId]}
                        isToggling={togglingIds.has(q.testNodeId)}
                        isDeleting={deletingIds.has(q.testNodeId)}
                        onToggle={() => handleToggle(q)}
                        onDelete={() => handleDelete(q)}
                    />
                ))}
                {detail.questions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-10 col-span-2">
                        {isDragOver ? "" : "No questions in this test yet."}
                    </p>
                )}
            </div>
        </div>
    );
}

// ── QuestionRow ────────────────────────────────────────────────────────────────

interface QuestionRowProps {
    index: number;
    question: KTestQuestion;
    entityName?: string;
    isToggling: boolean;
    isDeleting: boolean;
    onToggle: () => void;
    onDelete: () => void;
}

function QuestionRow({ index, question, isToggling, isDeleting, onToggle, onDelete }: QuestionRowProps) {
    return (
        <div className={`group/row rounded-lg border bg-card p-3 flex gap-2 transition-opacity ${question.isActive ? "border-border" : "border-border/50 opacity-50"}`}>
            {/* isActive toggle */}
            <div className="">
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
                {/* Question text */}
                <p className="text-sm leading-relaxed text-white">{question.question}</p>

                {/* Answer (description) */}
                {question.answer && (
                    <p className="text-xs text-muted-foreground/30 leading-relaxed">
                        {question.answer}
                    </p>
                )}

                {/* Per-question score dot history */}
                {question.scoreHistory.length > 0 && (
                    <QuestionScoreDots scores={question.scoreHistory} />
                )}
            </div>

            {/* Delete button — visible on hover */}
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

// ── QuestionScoreDots — per-question score history ────────────────────────────
// Shows last ≤10 attempts as filled segments (0–5 scale), oldest left → newest right.

function QuestionScoreDots({ scores }: { scores: number[] }) {
    const MAX_SCORE = 5;
    const SLOTS     = 10;
    // Pad left with nulls for slots with no history yet
    const slots: (number | null)[] = [
        ...Array(Math.max(0, SLOTS - scores.length)).fill(null),
        ...scores.slice(-SLOTS),
    ];

    const segColor = (pt: number) => {
        if (pt >= 4) return "#22c55e";   // green
        if (pt >= 3) return "#84cc16";   // lime
        if (pt >= 2) return "#eab308";   // yellow
        if (pt >= 1) return "#f97316";   // orange
        return "#ef4444";                // red
    };

    return (
        <div className="flex items-end gap-[3px] mt-1" title="Score history (oldest → newest, 0–5 pts)">
            {slots.map((pt, i) => {
                if (pt === null) {
                    return (
                        <div
                            key={i}
                            className="w-3 rounded-sm bg-white/5"
                            style={{ height: 12 }}
                        />
                    );
                }
                const fillH = Math.max(2, Math.round((pt / MAX_SCORE) * 12));
                return (
                    <div key={i} className="w-3 rounded-sm bg-white/5 flex items-end overflow-hidden" style={{ height: 12 }} title={`${pt}/5`}>
                        <div
                            className="w-full rounded-sm"
                            style={{ height: fillH, backgroundColor: segColor(pt), opacity: 0.85 }}
                        />
                    </div>
                );
            })}
        </div>
    );
}
