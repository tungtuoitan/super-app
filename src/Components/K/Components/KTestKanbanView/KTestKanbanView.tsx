import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, Loader2, Pencil, Play, Plus, X, HelpCircle, Mic, Trash2, RotateCcw, Eye, EyeOff, BookX } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import { Button } from "@/Components/ui/button";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { useKTestStore } from "../../store/useKTest.store";
import { useKTestLoader } from "../../hooks/useKTest.loader";
import { KTestService } from "../../service/kTest.service";
import { AutoResizeTextarea } from "../KNodeEditorPanel/AutoResizeTextarea";
import { CARD_HEIGHT } from "../../hooks/kNodeEditor.miniHelper";
import { useGlobalShortcut } from "@/shared/hooks/useGlobalShortcut";
import { NodeCard } from "../KNodeEditorPanel/NodeCard";
import { KNodeEditorProvider } from "../../store/KNodeEditor.store";
import { ScoreSparkline } from "../small/ScoreSparkline";
import type { KTestDetail, KTestQuestion, KTestSummary } from "../../types/kTest.type";
import type { KItemV2 } from "../../types/K-v2.types";

const KANBAN_DND  = "kanban-question-card";
const COLUMN_DND  = "kanban-column";

interface QuestionDragItem { questionId: number; sourceTestId: number; items?: { questionId: number; sourceTestId: number }[]; }
interface ColumnDragItem   { testId: number; index: number; }

interface KTestKanbanViewProps {
    knowledgeId: number;
    onStartTest: (detail: KTestDetail) => void;
    onStartRecordTest: (detail: KTestDetail) => void;
}

export function KTestKanbanView({ knowledgeId, onStartTest, onStartRecordTest }: KTestKanbanViewProps) {
    const { tests, isLoadingTests, activeNodeId } = useKTestStore();
    const { loadTests, updateQuestions, createEmptyTest, reorderTests } = useKTestLoader();
    const [detailsMap, setDetailsMap] = useState<Record<number, KTestDetail>>({});
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [creatingTest, setCreatingTest]     = useState(false);
    const [newTestTitle, setNewTestTitle]     = useState("");
    const [creating, setCreating]             = useState(false);
    const newTitleRef = useRef<HTMLInputElement>(null);
    const [selectedMap, setSelectedMap] = useState<Map<number, number>>(new Map()); // questionId -> testId
    const lastLoadKeyRef = useRef<string | null>(null);

    useEffect(() => {
        const key = `${knowledgeId}:${activeNodeId}`;
        if (key === lastLoadKeyRef.current) return;
        lastLoadKeyRef.current = key;
        if (knowledgeId > 0) loadTests(knowledgeId, activeNodeId ?? undefined);
    }, [knowledgeId, activeNodeId]);

    useEffect(() => {
        if (!tests.length) { setDetailsMap({}); return; }
        setLoadingDetails(true);
        Promise.all(
            tests.map(t =>
                KTestService._getTestDetail(knowledgeId, t.id)
                    .then(res => res.success && res.object ? { id: t.id, detail: res.object } : null)
                    .catch(() => null)
            )
        ).then(results => {
            const map: Record<number, KTestDetail> = {};
            results.forEach(r => { if (r) map[r.id] = r.detail; });
            setDetailsMap(map);
        }).finally(() => setLoadingDetails(false));
    }, [knowledgeId, tests]);

    const handleStart = async (test: KTestSummary) => {
        const res = await KTestService._getTestDetail(knowledgeId, test.id);
        if (res.success && res.object) {
            const filtered = { ...res.object, questions: res.object.questions.filter(q => !q.deletedAt && q.isActive) };
            onStartTest(filtered);
        }
    };

    const handleStartRecord = async (test: KTestSummary) => {
        const res = await KTestService._getTestDetail(knowledgeId, test.id);
        if (res.success && res.object) {
            const filtered = { ...res.object, questions: res.object.questions.filter(q => !q.deletedAt && q.isActive) };
            onStartRecordTest(filtered);
        }
    };

    const handleCreateTest = async () => {
        if (!newTestTitle.trim() || creating) return;
        setCreating(true);
        try {
            await createEmptyTest(knowledgeId, newTestTitle.trim(), activeNodeId ?? undefined);
            setNewTestTitle("");
            setCreatingTest(false);
        } finally { setCreating(false); }
    };

    const handleToggleSelect = (questionId: number, testId: number) => {
        setSelectedMap(prev => {
            const next = new Map(prev);
            if (next.has(questionId)) next.delete(questionId);
            else next.set(questionId, testId);
            return next;
        });
    };
    const handleClearSelection = () => { if (selectedMap.size > 0) setSelectedMap(new Map()); };

    const handleColumnDrop = async (draggedIndex: number, insertIndex: number) => {
        if (insertIndex === draggedIndex || insertIndex === draggedIndex + 1) return;
        const newOrder = [...tests];
        const [moved] = newOrder.splice(draggedIndex, 1);
        const adjustedInsert = insertIndex > draggedIndex ? insertIndex - 1 : insertIndex;
        newOrder.splice(adjustedInsert, 0, moved);
        await reorderTests(knowledgeId, newOrder.map(t => t.id));
    };

    // Move question(s) between tests — supports single & bulk (shift-select) moves
    const handleMoveQuestion = async (item: QuestionDragItem, targetTestId: number) => {
        const allItems = item.items?.length ? item.items : [{ questionId: item.questionId, sourceTestId: item.sourceTestId }];
        const toMove = allItems.filter(i => i.sourceTestId !== targetTestId);
        if (!toMove.length) return;

        // Group by source test
        const bySource = new Map<number, number[]>();
        const questionsToAdd: { name: string; description: string | null }[] = [];
        const movedQuestions: KTestQuestion[] = [];

        for (const it of toMove) {
            const srcDetail = detailsMap[it.sourceTestId];
            const q = srcDetail?.questions.find(x => x.id === it.questionId);
            if (!q) continue;
            if (!bySource.has(it.sourceTestId)) bySource.set(it.sourceTestId, []);
            bySource.get(it.sourceTestId)!.push(it.questionId);
            questionsToAdd.push({ name: q.question, description: q.answer });
            movedQuestions.push(q);
        }
        if (!questionsToAdd.length) return;

        // Optimistic update
        setDetailsMap(prev => {
            const next = { ...prev };
            for (const [srcId, qIds] of bySource) {
                if (next[srcId]) next[srcId] = { ...next[srcId], questions: next[srcId].questions.filter(x => !qIds.includes(x.id)) };
            }
            if (next[targetTestId]) next[targetTestId] = { ...next[targetTestId], questions: [...next[targetTestId].questions, ...movedQuestions] };
            return next;
        });
        setSelectedMap(new Map());

        try {
            // Delete from all sources in parallel
            await Promise.all(
                Array.from(bySource.entries()).map(([srcId, qIds]) =>
                    updateQuestions(knowledgeId, srcId, { addQuestions: [], updateQuestions: [], toggleQuestionIds: [], deleteQuestionIds: qIds, restoreQuestionIds: [] })
                )
            );
            // Add to target
            await updateQuestions(knowledgeId, targetTestId, { addQuestions: questionsToAdd, updateQuestions: [], toggleQuestionIds: [], deleteQuestionIds: [], restoreQuestionIds: [] });

            // Refresh all affected tests
            const affectedIds = [targetTestId, ...bySource.keys()];
            const results = await Promise.all(affectedIds.map(id => KTestService._getTestDetail(knowledgeId, id).catch(() => null)));
            setDetailsMap(prev => {
                const next = { ...prev };
                const ids = [...affectedIds];
                results.forEach((res, i) => { if (res?.success && res.object) next[ids[i]] = res.object; });
                return next;
            });
        } catch (e) {
            console.error("move question(s) failed", e);
        }
    };

    // After a new question is created in a test, refresh that test's detail
    const handleNewCardCreated = async (testId: number) => {
        const res = await KTestService._getTestDetail(knowledgeId, testId).catch(() => null);
        if (res?.success && res.object) {
            setDetailsMap(prev => ({ ...prev, [testId]: res.object! }));
        }
    };

    const handleRefreshTest = async (testId: number) => {
        const res = await KTestService._getTestDetail(knowledgeId, testId).catch(() => null);
        if (res?.success && res.object) {
            setDetailsMap(prev => ({ ...prev, [testId]: res.object! }));
        }
    };

    const handleOptimisticUpdateQuestion = (testId: number, questionId: number, patch: { name: string; description: string | null }) => {
        setDetailsMap(prev => {
            const detail = prev[testId];
            if (!detail) return prev;
            return {
                ...prev,
                [testId]: {
                    ...detail,
                    questions: detail.questions.map(q =>
                        q.id === questionId ? { ...q, question: patch.name, answer: patch.description } : q
                    ),
                },
            };
        });
    };

    const startCreateTest = () => {
        setCreatingTest(true);
        setTimeout(() => newTitleRef.current?.focus(), 0);
    };

    const cancelCreateTest = () => { setCreatingTest(false); setNewTestTitle(""); };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/60 shrink-0">
                {creatingTest ? (
                    <div className="flex items-center gap-2">
                        <input
                            ref={newTitleRef}
                            value={newTestTitle}
                            onChange={e => setNewTestTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleCreateTest(); if (e.key === "Escape") cancelCreateTest(); }}
                            placeholder="Test name…"
                            disabled={creating}
                            className="text-sm bg-zinc-900 border border-zinc-700 rounded px-2 py-1 outline-none focus:border-zinc-500 w-48"
                        />
                        <button
                            onClick={handleCreateTest}
                            disabled={creating || !newTestTitle.trim()}
                            className="text-green-500 hover:text-green-400 disabled:opacity-40"
                        >
                            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={cancelCreateTest} className="text-zinc-500 hover:text-zinc-300">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={startCreateTest}>
                        <Plus className="w-3.5 h-3.5" />
                        New Test
                    </Button>
                )}
                <span className="text-xs text-zinc-600 ml-auto">
                    {selectedMap.size > 0 && <span className="text-blue-400 mr-2">{selectedMap.size} selected</span>}
                    {tests.length} test{tests.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Kanban board */}
            {isLoadingTests || loadingDetails ? (
                <div className="flex items-center justify-center flex-1">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="flex gap-3 flex-1 overflow-x-auto px-4 py-4" onClick={handleClearSelection}>
                    {tests.map((test, index) => {
                        const detail = detailsMap[test.id];
                        const questions = detail?.questions ?? [];

                        return (
                            <KanbanColumn
                                key={test.id}
                                index={index}
                                test={test}
                                questions={questions}
                                knowledgeId={knowledgeId}
                                onStart={() => handleStart(test)}
                                onStartRecord={() => handleStartRecord(test)}
                                onRename={async (title) => {
                                    await KTestService._updateTest(knowledgeId, test.id, { title });
                                    await loadTests(knowledgeId, activeNodeId ?? undefined);
                                }}
                                onDrop={(item) => handleMoveQuestion(item, test.id)}
                                onColumnDrop={(draggedIndex, insertIndex) => handleColumnDrop(draggedIndex, insertIndex)}
                                onNewCardCreated={() => handleNewCardCreated(test.id)}
                                onRefresh={() => handleRefreshTest(test.id)}
                                onOptimisticUpdate={(qId, patch) => handleOptimisticUpdateQuestion(test.id, qId, patch)}
                                selectedIds={selectedMap}
                                onToggleSelect={handleToggleSelect}
                                onClearSelection={handleClearSelection}
                                onStatusChange={async (status) => {
                                    await KTestService._updateTestStatus(knowledgeId, test.id, status);
                                    await loadTests(knowledgeId, activeNodeId ?? undefined);
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── KanbanColumn ──────────────────────────────────────────────────────────────

interface KanbanColumnProps {
    index: number;
    test: KTestSummary;
    questions: KTestQuestion[];
    knowledgeId: number;
    onStart: () => void;
    onStartRecord: () => void;
    onRename: (title: string) => Promise<void>;
    onDrop: (item: QuestionDragItem) => void;
    onColumnDrop: (draggedIndex: number, insertIndex: number) => void;
    onNewCardCreated: () => void;
    onRefresh: () => Promise<void>;
    onOptimisticUpdate: (questionId: number, patch: { name: string; description: string | null }) => void;
    onStatusChange: (status: string) => Promise<void>;
    selectedIds: Map<number, number>;
    onToggleSelect: (questionId: number, testId: number) => void;
    onClearSelection: () => void;
}

function KanbanColumn({ index, test, questions, knowledgeId, onStart, onStartRecord, onRename, onDrop, onColumnDrop, onNewCardCreated, onRefresh, onOptimisticUpdate, onStatusChange, selectedIds, onToggleSelect, onClearSelection }: KanbanColumnProps) {
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft]     = useState("");
    const [isSaving, setIsSaving]         = useState(false);
    const [ctxMenu, setCtxMenu]           = useState<{ x: number; y: number } | null>(null);
    const [showNewCard, setShowNewCard]   = useState(false);
    const [showDeleted, setShowDeleted]   = useState(false);
    const [dropSide, setDropSide]         = useState<"left" | "right" | null>(null);
    const inputRef    = useRef<HTMLInputElement>(null);
    const columnRef   = useRef<HTMLDivElement>(null);
    const headerRef   = useRef<HTMLDivElement>(null);
    const ctxMenuRef  = useRef<HTMLDivElement>(null);
    const dropSideRef = useRef<"left" | "right">("left");

    const isAnyEditing = editingTitle || showNewCard;

    // Drop zone for card moves (whole column)
    const [{ isOver, canDrop }, dropRef] = useDrop<QuestionDragItem, void, { isOver: boolean; canDrop: boolean }>(() => ({
        accept: KANBAN_DND,
        canDrop: (item) => item.sourceTestId !== test.id && !isAnyEditing,
        drop: (item) => onDrop(item),
        collect: monitor => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
    }), [test.id, onDrop, isAnyEditing]);
    dropRef(columnRef);

    // Drag source for column reorder (header only)
    const [{ isColumnDragging }, colDragRef] = useDrag<ColumnDragItem, void, { isColumnDragging: boolean }>(() => ({
        type: COLUMN_DND,
        item: { testId: test.id, index },
        canDrag: () => !isAnyEditing,
        collect: monitor => ({ isColumnDragging: monitor.isDragging() }),
    }), [test.id, index, isAnyEditing]);

    // Drop zone for column reorder
    const [{ isColumnOver, canColumnDrop }, colDropRef] = useDrop<ColumnDragItem, void, { isColumnOver: boolean; canColumnDrop: boolean }>(() => ({
        accept: COLUMN_DND,
        canDrop: (item) => item.testId !== test.id && !isAnyEditing,
        hover: (_, monitor) => {
            if (!monitor.canDrop()) return;
            const offset = monitor.getClientOffset();
            const rect   = columnRef.current?.getBoundingClientRect();
            if (!offset || !rect) return;
            const side = offset.x < rect.left + rect.width / 2 ? "left" : "right";
            dropSideRef.current = side;
            setDropSide(side);
        },
        drop: (item) => {
            const insertIndex = dropSideRef.current === "left" ? index : index + 1;
            onColumnDrop(item.index, insertIndex);
        },
        collect: monitor => ({
            isColumnOver:  monitor.isOver(),
            canColumnDrop: monitor.canDrop(),
        }),
    }), [test.id, index, onColumnDrop, isAnyEditing]);

    useEffect(() => { if (!isColumnOver) setDropSide(null); }, [isColumnOver]);

    colDragRef(headerRef);
    colDropRef(columnRef);

    const startEdit = () => {
        setTitleDraft(test.title);
        setEditingTitle(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };
    const cancelEdit = () => { setEditingTitle(false); setTitleDraft(""); };
    const saveEdit = async () => {
        if (!titleDraft.trim() || isSaving) return;
        setIsSaving(true);
        try { await onRename(titleDraft.trim()); setEditingTitle(false); }
        finally { setIsSaving(false); }
    };

    // ── Context menu ─────────────────────────────────────────────────────────
    const openCtxMenu = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY }); };
    const closeCtxMenu = () => setCtxMenu(null);

    useEffect(() => {
        if (!ctxMenu) return;
        const handler = (e: MouseEvent) => { if (!ctxMenuRef.current?.contains(e.target as Node)) closeCtxMenu(); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ctxMenu]);

    const dropActive = isOver && canDrop;

    return (
        <div
            ref={columnRef}
            className={`relative flex flex-col shrink-0 rounded-lg border transition-all ${isColumnDragging ? "!w-0 !min-w-0 overflow-hidden opacity-0 border-0" : "w-64"} ${dropActive ? "border-blue-500/60 bg-blue-950/20" : "border-zinc-800/60 bg-zinc-900/30"}`}
            onContextMenu={openCtxMenu}
        >
            {/* Column insertion indicator */}
            {isColumnOver && canColumnDrop && dropSide === "left" && (
                <div className="absolute -left-1.5 top-2 bottom-2 w-0.5 bg-blue-500 rounded-full z-20 shadow-[0_0_6px_1px_rgba(59,130,246,0.6)]" />
            )}
            {isColumnOver && canColumnDrop && dropSide === "right" && (
                <div className="absolute -right-1.5 top-2 bottom-2 w-0.5 bg-blue-500 rounded-full z-20 shadow-[0_0_6px_1px_rgba(59,130,246,0.6)]" />
            )}

            {/* Header — draggable to reorder */}
            <div
                ref={headerRef}
                className="group flex flex-col shrink-0 border-b border-zinc-800/60 rounded-t-lg cursor-grab active:cursor-grabbing"
            >
                {/* Row 1: title + controls */}
                <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex-1 min-w-0">
                    {editingTitle ? (
                        <div className="flex items-center gap-1">
                            <input
                                ref={inputRef}
                                value={titleDraft}
                                onChange={e => setTitleDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                                disabled={isSaving}
                                className="flex-1 text-sm font-medium bg-transparent border-b border-zinc-600 outline-none py-0.5 min-w-0"
                                maxLength={200}
                            />
                            <button onClick={saveEdit} disabled={isSaving || !titleDraft.trim()} className="text-green-500 hover:text-green-400 disabled:opacity-40 shrink-0">
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            </button>
                            <button onClick={cancelEdit} className="text-zinc-500 hover:text-zinc-300 shrink-0">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-medium truncate">{test.title}</span>
                            <button onClick={startEdit} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 shrink-0" title="Rename">
                                <Pencil className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
                <span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5 leading-none shrink-0">
                    {questions.filter(q => !q.deletedAt).length}
                </span>
                {questions.some(q => q.deletedAt) && (
                    <button
                        onClick={e => { e.stopPropagation(); setShowDeleted(v => !v); }}
                        title={showDeleted ? "Hide deleted" : "Show deleted"}
                        className={`p-0.5 rounded transition-colors shrink-0 ${showDeleted ? "text-red-400" : "text-zinc-600 hover:text-zinc-400"}`}
                    >
                        {showDeleted ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                )}
                <button
                    onClick={e => {
                        e.stopPropagation();
                        const next = test.status === "learning" || test.status === "mastered" ? "inactive" : "learning";
                        onStatusChange(next);
                    }}
                    title={test.status === "learning" ? "Learning (click to deactivate)" : test.status === "mastered" ? "Mastered (click to deactivate)" : "Inactive (click to start learning)"}
                    className={`p-0.5 rounded transition-colors shrink-0 ${
                        test.status === "learning" ? "text-blue-400 hover:text-blue-300" :
                        test.status === "mastered" ? "text-purple-400 hover:text-purple-300" :
                        "text-zinc-600 hover:text-zinc-400"
                    }`}
                >
                    {test.status === "learning" || test.status === "mastered"
                        ? <BookOpen className="w-3 h-3" />
                        : <BookX className="w-3 h-3" />}
                </button>
                </div>

                {/* Row 2: score history sparkline */}
                {test.scoreHistory.length > 0 && (
                    <div className="flex items-center gap-2 px-3 pb-2">
                        <ScoreSparkline scores={test.scoreHistory} slots={7} />
                        {test.lastPct != null && (
                            <span className={`text-[10px] font-medium ${
                                test.lastPct >= 70 ? "text-green-500" : test.lastPct >= 40 ? "text-yellow-500" : "text-red-500"
                            }`}>
                                {test.lastPct}%
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Cards */}
            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-1.5 p-2">
                    {questions.filter(q => showDeleted || !q.deletedAt).map(q => (
                        <DraggableQuestionCard key={q.id} question={q} testId={test.id} knowledgeId={knowledgeId} onRefresh={onRefresh} onOptimisticUpdate={onOptimisticUpdate} isSelected={selectedIds.has(q.id)} selectedIds={selectedIds} onToggleSelect={onToggleSelect} onClearSelection={onClearSelection} />
                    ))}
                    {showNewCard && (
                        <KanbanQuestionInlineForm
                            knowledgeId={knowledgeId}
                            testId={test.id}
                            onDone={() => { setShowNewCard(false); onNewCardCreated(); }}
                            onCancel={() => setShowNewCard(false)}
                        />
                    )}
                    {questions.filter(q => showDeleted || !q.deletedAt).length === 0 && !showNewCard && (
                        <p className={`text-xs text-center py-6 transition-colors ${dropActive ? "text-blue-400" : "text-zinc-700"}`}>
                            {dropActive ? "Drop here" : "No questions"}
                        </p>
                    )}
                </div>
            </ScrollArea>

            {/* Context menu */}
            {ctxMenu && (
                <div
                    ref={ctxMenuRef}
                    className="fixed z-50 min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 text-sm"
                    style={{ top: ctxMenu.y, left: ctxMenu.x }}
                >
                    <button
                        onClick={() => { closeCtxMenu(); onStart(); }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-zinc-200"
                    >
                        <Play className="w-3.5 h-3.5 text-zinc-400" />
                        Start Test
                    </button>
                    <button
                        onClick={() => { closeCtxMenu(); onStartRecord(); }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-zinc-200"
                    >
                        <Mic className="w-3.5 h-3.5 text-zinc-400" />
                        Record Mode
                    </button>
                    <div className="my-1 border-t border-zinc-800" />
                    <button
                        onClick={() => { closeCtxMenu(); setShowNewCard(true); }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-zinc-200"
                    >
                        <Plus className="w-3.5 h-3.5 text-zinc-400" />
                        New Card
                    </button>
                </div>
            )}
        </div>
    );
}

// ── DraggableQuestionCard ────────────────────────────────────────────────────

function DraggableQuestionCard({ question, testId, knowledgeId, onRefresh, onOptimisticUpdate, isSelected, selectedIds, onToggleSelect, onClearSelection }: { question: KTestQuestion; testId: number; knowledgeId: number; onRefresh: () => Promise<void>; onOptimisticUpdate: (questionId: number, patch: { name: string; description: string | null }) => void; isSelected: boolean; selectedIds: Map<number, number>; onToggleSelect: (questionId: number, testId: number) => void; onClearSelection: () => void }) {
    const wrapperRef  = useRef<HTMLDivElement>(null);
    const ctxMenuRef  = useRef<HTMLDivElement>(null);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

    const [{ isDragging }, dragRef] = useDrag<QuestionDragItem, void, { isDragging: boolean }>(() => ({
        type: KANBAN_DND,
        item: () => {
            if (isSelected && selectedIds.size > 1) {
                const items = Array.from(selectedIds.entries()).map(([qId, tId]) => ({ questionId: qId, sourceTestId: tId }));
                return { questionId: question.id, sourceTestId: testId, items };
            }
            onClearSelection();
            return { questionId: question.id, sourceTestId: testId };
        },
        canDrag: () => !question.deletedAt,
        collect: monitor => ({ isDragging: monitor.isDragging() }),
    }), [question.id, testId, question.deletedAt, isSelected, selectedIds, onClearSelection]);

    dragRef(wrapperRef);

    useEffect(() => {
        if (!ctxMenu) return;
        const handler = (e: MouseEvent) => { if (!ctxMenuRef.current?.contains(e.target as Node)) setCtxMenu(null); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ctxMenu]);

    const node: KItemV2 = {
        id: question.id,
        knowledgeId,
        parentId: null,
        name: question.question,
        description: question.answer,
        color: null,
        icon: null,
        statusCode: null,
        pathIds: "",
        pathDepth: 1,
        createdAt: "",
        deletedAt: question.deletedAt ?? undefined,
    };

    const handleSubmitEdit = async (draft: { name: string; description: string; icon: string | null; color: string | null }) => {
        onOptimisticUpdate(question.id, { name: draft.name, description: draft.description || null });
        await KTestService._updateQuestions(knowledgeId, testId, {
            addQuestions: [],
            updateQuestions: [{ id: question.id, name: draft.name, description: draft.description || null }],
            toggleQuestionIds: [],
            deleteQuestionIds: [],
            restoreQuestionIds: [],
        });
        await onRefresh();
    };

    const handleDelete = async () => {
        setCtxMenu(null);
        await KTestService._updateQuestions(knowledgeId, testId, {
            addQuestions: [], updateQuestions: [], toggleQuestionIds: [],
            deleteQuestionIds: [question.id], restoreQuestionIds: [],
        });
        await onRefresh();
    };

    const handleRestore = async () => {
        setCtxMenu(null);
        await KTestService._updateQuestions(knowledgeId, testId, {
            addQuestions: [], updateQuestions: [], toggleQuestionIds: [],
            deleteQuestionIds: [], restoreQuestionIds: [question.id],
        });
        await onRefresh();
    };

    return (
        <div
            ref={wrapperRef}
            className={isSelected ? "ring-1 ring-blue-500/70 rounded-lg" : ""}
            style={{ opacity: isDragging ? 0 : 1, cursor: question.deletedAt ? "default" : "grab" }}
            onClick={e => {
                if (e.shiftKey && !question.deletedAt) { e.stopPropagation(); onToggleSelect(question.id, testId); }
            }}
            onContextMenuCapture={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
        >
            <KNodeEditorProvider rootNode={node}>
                <NodeCard node={node} compact onSubmitEdit={handleSubmitEdit} />
            </KNodeEditorProvider>

            {ctxMenu && (
                <div
                    ref={ctxMenuRef}
                    className="fixed z-50 min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 text-sm"
                    style={{ top: ctxMenu.y, left: ctxMenu.x }}
                >
                    {question.deletedAt ? (
                        <button
                            onClick={handleRestore}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-green-400"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                        </button>
                    ) : (
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-red-400"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ── KanbanQuestionInlineForm ─────────────────────────────────────────────────
// Creates a k.question directly via the API (no k.node involved).

interface KanbanQuestionInlineFormProps {
    knowledgeId: number;
    testId: number;
    onDone: () => void;
    onCancel: () => void;
}

function KanbanQuestionInlineForm({ knowledgeId, testId, onDone, onCancel }: KanbanQuestionInlineFormProps) {
    const [name, setName]               = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving]           = useState(false);
    const inputRef                      = useRef<HTMLInputElement>(null);
    const { updateQuestions }           = useKTestLoader();

    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 30); }, []);

    const handleSave = async () => {
        if (!name.trim() || saving) return;
        setSaving(true);
        try {
            await updateQuestions(knowledgeId, testId, {
                addQuestions: [{ name: name.trim(), description: description.trim() || null }],
                updateQuestions: [], toggleQuestionIds: [],
                deleteQuestionIds: [], restoreQuestionIds: [],
            });
            onDone();
        } catch (e) {
            console.error(e);
            setSaving(false);
        }
    };

    // Ctrl+S saves — same pattern as NodeCard (priority 100 beats EditorToolbar's 50)
    useGlobalShortcut("ctrl+s", { id: "kanban-new-question-save", priority: 100, enabled: !saving }, () => {
        handleSave();
        return true;
    });

    return (
        <div
            className={`relative rounded-lg border flex flex-col ${CARD_HEIGHT} transition-all duration-150 border-blue-500/60`}
            style={{ backgroundColor: "#0a0a0a" }}
        >
            {/* HelpCircle icon — top left */}
            <div className="absolute top-2 left-2 z-10 w-5 h-5 flex items-center justify-center pointer-events-none">
                <HelpCircle className="w-3.5 h-3.5" style={{ color: "#6b7280" }} strokeWidth={2} />
            </div>

            {/* Header */}
            <div className="flex items-center gap-1.5 px-4 pt-3.5 pb-2 shrink-0 h-8">
                <span className="text-[10px] font-mono text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5 leading-none">
                    New
                </span>
                <div className="ml-auto flex items-center gap-1">
                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="text-[11px] text-zinc-400 hover:text-green-400 disabled:opacity-30 px-1.5 py-0.5 rounded"
                    >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </button>
                    <button onClick={onCancel} disabled={saving} className="text-zinc-600 hover:text-zinc-300 p-0.5 rounded">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Name */}
            <div className="px-4 shrink-0">
                <input
                    ref={inputRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Question"
                    disabled={saving}
                    className="w-full bg-transparent text-sm font-semibold text-left outline-none border-b border-zinc-700 pb-0.5 text-white"
                    onKeyDown={e => { if (e.key === "Escape") onCancel(); }}
                />
            </div>

            {/* Description */}
            <div className="px-4 pt-2 flex-1 min-h-0 overflow-y-auto">
                <AutoResizeTextarea
                    value={description}
                    onChange={v => setDescription(v)}
                    placeholder="Answer… (Ctrl+S to save)"
                    className="text-xs text-zinc-400 leading-relaxed w-full text-left"
                    onKeyDown={e => { if (e.key === "Escape") onCancel(); }}
                />
            </div>

            <div className="px-4 pb-3 pt-2 shrink-0 border-t border-zinc-800/60" />
        </div>
    );
}
