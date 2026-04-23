import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, BookX, Check, Loader2, Plus, RotateCcw, X } from "lucide-react";
import { useKTestStore } from "../store/useKTest.store";
import { useKTestLoader } from "../hooks/useKTest.loader";
import { KTestService } from "../service/kTest.service";
import { ScoreSparkline } from "./small/ScoreSparkline";
import type { KTestSummary } from "../types/kTest.type";

interface KTestListProps {
    knowledgeId: number;
    onSelectTest?: (testId: number) => void;
}

export function KTestList({ knowledgeId, onSelectTest }: KTestListProps) {
    const { tests, isLoadingTests, activeNodeId } = useKTestStore();
    const { loadTests, createEmptyTest } = useKTestLoader();
    const lastLoadKeyRef = useRef<string | null>(null);

    const [showDeleted, setShowDeleted] = useState(false);
    const [creatingTest, setCreatingTest] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [creating, setCreating] = useState(false);
    const [renamingId, setRenamingId] = useState<number | null>(null);
    const [renameDraft, setRenameDraft] = useState("");
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; test: KTestSummary } | null>(null);
    const ctxMenuRef = useRef<HTMLDivElement>(null);
    const newTitleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const key = `${knowledgeId}:${activeNodeId}`;
        if (key === lastLoadKeyRef.current) return;
        lastLoadKeyRef.current = key;
        if (knowledgeId > 0) loadTests(knowledgeId, activeNodeId ?? undefined);
    }, [knowledgeId, activeNodeId]);

    useEffect(() => {
        const handler = (e: Event) => {
            const { sourceNodeId, knowledgeId: kId } = (e as CustomEvent).detail;
            if (kId === knowledgeId && sourceNodeId === activeNodeId) loadTests(knowledgeId, activeNodeId ?? undefined);
        };
        window.addEventListener("k-test-moved", handler);
        return () => window.removeEventListener("k-test-moved", handler);
    }, [knowledgeId, activeNodeId]);

    useEffect(() => {
        if (!ctxMenu) return;
        const handler = (e: MouseEvent) => {
            if (!ctxMenuRef.current?.contains(e.target as Node)) setCtxMenu(null);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ctxMenu]);

    const refresh = () => loadTests(knowledgeId, activeNodeId ?? undefined);

    const handleCreateTest = async () => {
        if (!newTitle.trim() || creating) return;
        setCreating(true);
        try { await createEmptyTest(knowledgeId, newTitle.trim(), activeNodeId ?? undefined); setNewTitle(""); setCreatingTest(false); }
        finally { setCreating(false); }
    };

    const handleRename = async (test: KTestSummary) => {
        if (!renameDraft.trim() || renameDraft === test.title) { setRenamingId(null); return; }
        await KTestService._updateTest(knowledgeId, test.id, { title: renameDraft.trim() });
        setRenamingId(null);
        refresh();
    };

    const startRename = (test: KTestSummary) => {
        setRenameDraft(test.title);
        setRenamingId(test.id);
    };

    const handleToggleStatus = async (test: KTestSummary) => {
        const next = test.status === "learning" || test.status === "mastered" ? "inactive" : "learning";
        await KTestService._updateTestStatus(knowledgeId, test.id, next);
        refresh();
    };

    const handleDelete = async (test: KTestSummary) => {
        setCtxMenu(null);
        await KTestService._deleteTest(knowledgeId, test.id);
        refresh();
    };

    const handleRestore = async (test: KTestSummary) => {
        setCtxMenu(null);
        await KTestService._restoreTest(knowledgeId, test.id);
        refresh();
    };

    const handleResetSrs = async (test: KTestSummary) => {
        setCtxMenu(null);
        const res = await KTestService._getTestDetail(knowledgeId, test.id);
        if (!res.success || !res.object) return;
        const ids = res.object.questions.filter((q) => !q.deletedAt).map((q) => q.id);
        if (!ids.length) return;
        await KTestService._updateQuestions(knowledgeId, test.id, {
            addQuestions: [], updateQuestions: [], toggleQuestionIds: [],
            deleteQuestionIds: [], restoreQuestionIds: [], resetSrsQuestionIds: ids,
        });
        refresh();
    };

    const allTests = tests;
    const visibleTests = showDeleted ? allTests : allTests.filter((t) => !t.deletedAt);
    const deletedCount = allTests.filter((t) => !!t.deletedAt).length;

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-4 pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Tests</span>
                        {!isLoadingTests && <span className="text-[10px] text-zinc-600">{allTests.filter((t) => !t.deletedAt).length}</span>}
                        {deletedCount > 0 && (
                            <button
                                onClick={() => setShowDeleted((v) => !v)}
                                className={`ml-1 text-[10px] px-1.5 py-0.5 rounded transition-colors ${showDeleted ? "text-red-400 bg-red-950/30" : "text-zinc-600 hover:text-zinc-400"}`}
                            >
                                {deletedCount} deleted
                            </button>
                        )}
                    </div>

                    {isLoadingTests ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            {visibleTests.map((t) => {
                                const isDeleted = !!t.deletedAt;
                                const isRenaming = renamingId === t.id;
                                return (
                                    <div
                                        key={t.id}
                                        onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, test: t }); }}
                                        className={`group flex items-center gap-2 w-full px-3 h-9 rounded-lg border transition-colors ${isDeleted ? "border-transparent opacity-50" : "border-transparent hover:border-zinc-700/60 hover:bg-zinc-800/40"}`}
                                    >
                                        <button
                                            onClick={() => !isDeleted && handleToggleStatus(t)}
                                            disabled={isDeleted}
                                            className="shrink-0 transition-colors"
                                            title={t.status === "learning" ? "Learning — deactivate" : t.status === "mastered" ? "Mastered — deactivate" : "Inactive — activate"}
                                        >
                                            {t.status === "learning" || t.status === "mastered"
                                                ? <BookOpen className={`w-3.5 h-3.5 ${t.status === "learning" ? "text-blue-400" : "text-purple-400"}`} />
                                                : <BookX className="w-3.5 h-3.5 text-zinc-600" />}
                                        </button>

                                        {isRenaming ? (
                                            <input
                                                autoFocus
                                                value={renameDraft}
                                                onChange={(e) => setRenameDraft(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter") handleRename(t); if (e.key === "Escape") setRenamingId(null); }}
                                                onBlur={() => handleRename(t)}
                                                className="w-32 shrink-0 text-sm font-medium bg-transparent border-b border-zinc-500 outline-none py-0.5"
                                            />
                                        ) : (
                                            <span
                                                onDoubleClick={() => !isDeleted && startRename(t)}
                                                className={`w-32 shrink-0 text-sm font-medium truncate ${isDeleted ? "text-zinc-600 line-through" : t.status === "learning" ? "text-zinc-100" : t.status === "mastered" ? "text-purple-200" : "text-zinc-400"}`}
                                            >
                                                {t.title}
                                            </span>
                                        )}

                                        <span className={`w-9 text-right text-xs font-mono shrink-0 ${t.lastPct == null ? "invisible" : t.lastPct >= 70 ? "text-green-500" : t.lastPct >= 40 ? "text-yellow-500" : "text-red-500"}`}>
                                            {t.lastPct ?? 0}%
                                        </span>
                                        <span className="w-6 text-right text-xs text-zinc-600 shrink-0">{t.questionCount}q</span>
                                        <div className="w-[52px] shrink-0 flex items-center">
                                            {t.scoreHistory.length > 0 && <ScoreSparkline scores={t.scoreHistory} slots={5} />}
                                        </div>

                                        <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isDeleted ? (
                                                <button onMouseDown={() => handleRestore(t)} className="text-xs text-green-500 hover:text-green-400 transition-colors">
                                                    Restore
                                                </button>
                                            ) : (
                                                <>
                                                    <button onMouseDown={() => handleDelete(t)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
                                                        Delete
                                                    </button>
                                                    {onSelectTest && (
                                                        <button onClick={() => onSelectTest(t.id)} className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
                                                            Go to flow
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {creatingTest ? (
                                <div className="flex items-center gap-1.5 px-3 h-9">
                                    <input
                                        ref={newTitleRef}
                                        autoFocus
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateTest(); if (e.key === "Escape") { setCreatingTest(false); setNewTitle(""); } }}
                                        placeholder="Test name…"
                                        disabled={creating}
                                        className="flex-1 text-sm bg-zinc-900 border border-zinc-700 rounded px-2 h-7 outline-none focus:border-zinc-500"
                                    />
                                    <button onClick={handleCreateTest} disabled={creating || !newTitle.trim()} className="text-green-500 hover:text-green-400 disabled:opacity-40">
                                        {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    </button>
                                    <button onClick={() => { setCreatingTest(false); setNewTitle(""); }} className="text-zinc-500 hover:text-zinc-300">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setCreatingTest(true)}
                                    className="flex items-center gap-2 px-3 h-9 text-xs text-zinc-600 hover:text-zinc-400 transition-colors rounded-lg hover:bg-zinc-800/30 w-full text-left"
                                >
                                    <Plus className="w-3.5 h-3.5" /> New Test
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {ctxMenu && createPortal(
                <div
                    ref={ctxMenuRef}
                    className="fixed z-[9999] min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 text-sm"
                    style={{ top: ctxMenu.y, left: ctxMenu.x }}
                >
                    {ctxMenu.test.deletedAt ? (
                        <button onMouseDown={() => handleRestore(ctxMenu.test)} className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 text-green-400">
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                        </button>
                    ) : (
                        <>
                            <button onMouseDown={() => { setCtxMenu(null); handleToggleStatus(ctxMenu.test); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 text-zinc-200">
                                {ctxMenu.test.status === "inactive" ? <BookOpen className="w-3.5 h-3.5 text-zinc-400" /> : <BookX className="w-3.5 h-3.5 text-zinc-400" />}
                                {ctxMenu.test.status === "inactive" ? "Activate" : "Deactivate"}
                            </button>
                            <div className="my-1 border-t border-zinc-800" />
                            <button onMouseDown={() => handleResetSrs(ctxMenu.test)} className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 text-amber-400">
                                <RotateCcw className="w-3.5 h-3.5" /> Reset SRS
                            </button>
                        </>
                    )}
                </div>,
                document.body,
            )}
        </div>
    );
}
