import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, Loader2, Pencil, Play, Plus, X } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import { ScoreSparkline } from "../small/ScoreSparkline";
import { useKTestStore } from "../../store/useKTest.store";
import { useKTestLoader } from "../../hooks/useKTest.loader";
import type { KTestDetail, KTestSummary } from "../../types/kTest.type";

interface KTestGridProps {
    knowledgeId: number;
    pendingStartTestId?: number | null;
    onPendingStartHandled?: () => void;
    onStartTest: (testDetail: KTestDetail) => void;
    onViewDetail: (testId: number) => void;
}

const LEVEL_LABEL: Record<number, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };
const LEVEL_CLASS: Record<number, string> = {
    1: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    2: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    3: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function KTestGrid({ knowledgeId, pendingStartTestId, onPendingStartHandled, onStartTest, onViewDetail }: KTestGridProps) {
    const { tests, isLoadingTests } = useKTestStore();
    const { loadTests, getTestDetail, createEmptyTest, updateTest } = useKTestLoader();

    const [startingId, setStartingId]   = useState<number | null>(null);
    const [creatingTest, setCreatingTest] = useState(false);
    const [newTestTitle, setNewTestTitle] = useState("");
    const [creating, setCreating]         = useState(false);
    const newTitleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (knowledgeId > 0) loadTests(knowledgeId);
    }, [knowledgeId]);

    // Auto-start a specific test
    useEffect(() => {
        if (!pendingStartTestId || isLoadingTests || tests.length === 0) return;
        const test = tests.find(t => t.id === pendingStartTestId);
        if (!test) return;
        onPendingStartHandled?.();
        handleStart(test);
    }, [pendingStartTestId, isLoadingTests, tests]);

    const handleStart = async (test: KTestSummary) => {
        setStartingId(test.id);
        try {
            const detail = await getTestDetail(knowledgeId, test.id);
            if (detail) onStartTest(detail);
        } finally {
            setStartingId(null);
        }
    };

    const handleCreateTest = async () => {
        if (!newTestTitle.trim() || creating) return;
        setCreating(true);
        try {
            await createEmptyTest(knowledgeId, newTestTitle.trim());
            setNewTestTitle("");
            setCreatingTest(false);
        } finally { setCreating(false); }
    };

    const startCreateTest = () => {
        setCreatingTest(true);
        setTimeout(() => newTitleRef.current?.focus(), 0);
    };

    const cancelCreateTest = () => { setCreatingTest(false); setNewTestTitle(""); };

    if (isLoadingTests) {
        return (
            <div className="flex items-center justify-center h-40">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-4 w-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold">Tests</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{tests.length} test{tests.length !== 1 ? "s" : ""}</p>
                </div>
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
                        <button onClick={handleCreateTest} disabled={creating || !newTestTitle.trim()} className="text-green-500 hover:text-green-400 disabled:opacity-40">
                            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={cancelCreateTest} className="text-zinc-500 hover:text-zinc-300">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <Button size="sm" variant="outline" onClick={startCreateTest}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        New Test
                    </Button>
                )}
            </div>

            {/* Empty state */}
            {tests.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                    <BookOpen className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No tests yet.</p>
                    <p className="text-xs">Click "New Test" to create one.</p>
                </div>
            )}

            {/* Test list */}
            <div className="grid grid-cols-2 gap-3">
                {tests.map((test) => (
                    <TestRow
                        key={test.id}
                        test={test}
                        isStarting={startingId === test.id}
                        onStart={() => handleStart(test)}
                        onView={() => onViewDetail(test.id)}
                        onRename={async (newTitle) => {
                            await updateTest(knowledgeId, test.id, { title: newTitle });
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

// ── TestRow ───────────────────────────────────────────────────────────────────

interface TestRowProps {
    test: KTestSummary;
    isStarting: boolean;
    onStart: () => void;
    onView: () => void;
    onRename: (newTitle: string) => Promise<void>;
}

function TestRow({ test, isStarting, onStart, onView, onRename }: TestRowProps) {
    const pct = test.lastTotalPoints != null && test.lastMaxPoints
        ? Math.round((test.lastTotalPoints / test.lastMaxPoints) * 100)
        : null;

    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft]     = useState("");
    const [isSaving, setIsSaving]         = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const startEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setTitleDraft(test.title);
        setEditingTitle(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const cancelEdit = () => { setEditingTitle(false); setTitleDraft(""); };

    const saveEdit = async () => {
        if (!titleDraft.trim() || isSaving) return;
        setIsSaving(true);
        try {
            await onRename(titleDraft.trim());
            setEditingTitle(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent/30 transition-colors">
            {/* Left — title + meta */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    {editingTitle ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <input
                                ref={inputRef}
                                value={titleDraft}
                                onChange={e => setTitleDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                                disabled={isSaving}
                                onClick={e => e.stopPropagation()}
                                className="flex-1 text-sm font-medium bg-transparent border-b border-primary outline-none py-0.5"
                                maxLength={500}
                            />
                            <button onClick={e => { e.stopPropagation(); saveEdit(); }} disabled={isSaving || !titleDraft.trim()} className="text-green-500 hover:text-green-400 disabled:opacity-40">
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            </button>
                            <button onClick={e => { e.stopPropagation(); cancelEdit(); }} className="text-muted-foreground hover:text-foreground">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-medium truncate">{test.title}</span>
                            <button
                                onClick={startEdit}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
                                title="Rename"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${LEVEL_CLASS[test.level] ?? LEVEL_CLASS[1]}`}>
                        {LEVEL_LABEL[test.level] ?? "Easy"}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{test.activeCount} questions</span>
                    {pct != null && (
                        <span className={pct >= 70 ? "text-green-500" : pct >= 40 ? "text-yellow-500" : "text-red-500"}>
                            Last: {pct}%
                        </span>
                    )}
                    {test.lastSubmittedAt && (
                        <span>{formatRelativeDate(test.lastSubmittedAt)}</span>
                    )}
                </div>
            </div>

            {/* Right — sparkline */}
            <ScoreSparkline scores={test.scoreHistory} slots={10} />

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0 opacity-20 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onView} title="View details">
                    <BookOpen className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" onClick={onStart} variant="ghost" disabled={isStarting} className="h-7 px-2 text-xs">
                    {isStarting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Play className="w-3 h-3" />
                    )}
                </Button>
            </div>
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return "1 month ago";
    if (months < 12) return `${months} months ago`;
    const years = Math.floor(days / 365);
    return years === 1 ? "1 year ago" : `${years} years ago`;
}

