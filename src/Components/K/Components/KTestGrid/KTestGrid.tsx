import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, FlaskConical, Loader2, Pencil, Play, X } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/Components/ui/dialog";
import { useKTestStore } from "../../store/useKTest.store";
import { useKTestLoader } from "../../hooks/useKTest.loader";
import { useKStore } from "../../store/K.store";
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
    const { loadTests, getTestDetail, createTestFromNodes, updateTest } = useKTestLoader();
    const { selectedItemIds, currentK } = useKStore();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [level, setLevel]                       = useState<1 | 2 | 3>(1);
    const [isCreating, setIsCreating]             = useState(false);
    const [createError, setCreateError]           = useState<string | null>(null);
    const [startingId, setStartingId]             = useState<number | null>(null);

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

    // Derive selected entity node IDs from the tree selection — skip deleted nodes
    const selectedEntityNodeIds = selectedItemIds.filter(id => {
        if (!currentK?.flatData) return false;
        const node = currentK.flatData.find(n => n.id === id);
        return node && !node.deletedAt && (node.nodeType === "entity" || node.nodeType == null);
    });

    const handleStart = async (test: KTestSummary) => {
        setStartingId(test.id);
        try {
            const detail = await getTestDetail(knowledgeId, test.id);
            if (detail) onStartTest(detail);
        } finally {
            setStartingId(null);
        }
    };

    const handleCreate = async () => {
        if (selectedEntityNodeIds.length === 0) {
            setCreateError("Select at least one entity node in the tree first.");
            return;
        }
        setIsCreating(true);
        setCreateError(null);
        try {
            const detail = await createTestFromNodes(knowledgeId, {
                title: `Test ${new Date().toLocaleDateString("en-US")}`,
                level,
                nodeIds: selectedEntityNodeIds,
                includeDescendants: true,
                count: 2147483647, // int.MaxValue — include all available questions
            });
            if (detail) {
                setCreateDialogOpen(false);
                loadTests(knowledgeId);
            } else {
                setCreateError("No questions found. Make sure the selected entity nodes have question children.");
            }
        } catch {
            setCreateError("Failed to create test. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

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
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setCreateError(null); setCreateDialogOpen(true); }}
                    title={selectedEntityNodeIds.length === 0 ? "Select entity nodes in the tree first" : "Create test from selected nodes"}
                >
                    <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
                    Create New Test
                    {selectedEntityNodeIds.length > 0 && (
                        <span className="ml-1.5 bg-primary text-primary-foreground rounded-full px-1.5 text-[10px]">
                            {selectedEntityNodeIds.length}
                        </span>
                    )}
                </Button>
            </div>

            {/* Empty state */}
            {tests.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                    <BookOpen className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No tests yet.</p>
                    <p className="text-xs">Select entity nodes in the tree and click "Create New test".</p>
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

            {/* Create test dialog */}
            <Dialog open={createDialogOpen} onOpenChange={(o) => { if (!isCreating) setCreateDialogOpen(o); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-sm flex items-center gap-2">
                            <FlaskConical className="w-4 h-4 text-primary" />
                            Create test from selected nodes
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-3 py-2">
                        {selectedEntityNodeIds.length === 0 ? (
                            <p className="text-xs text-destructive">
                                No nodes selected. Go back to the tree and select at least one entity node.
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                <strong>{selectedEntityNodeIds.length}</strong> entity node(s) selected.
                                All question nodes underneath will be included.
                            </p>
                        )}

                        {/* Level */}
                        <div>
                            <label className="text-xs text-muted-foreground uppercase tracking-widest block mb-1">
                                Difficulty
                            </label>
                            <div className="flex gap-2">
                                {([1, 2, 3] as const).map(l => (
                                    <button
                                        key={l}
                                        type="button"
                                        disabled={isCreating}
                                        onClick={() => setLevel(l)}
                                        className={`flex-1 py-1 rounded text-xs border transition-colors ${
                                            level === l
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border text-muted-foreground hover:border-primary/50"
                                        }`}
                                    >
                                        {LEVEL_LABEL[l]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {createError && (
                            <p className="text-xs text-destructive">{createError}</p>
                        )}
                        {isCreating && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Creating test...
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" size="sm" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleCreate}
                            disabled={isCreating || selectedEntityNodeIds.length === 0}
                            className="gap-1.5"
                        >
                            {isCreating
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating...</>
                                : <><FlaskConical className="w-3.5 h-3.5" />Create</>
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
            <ScoreSparkline scores={test.scoreHistory} />

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

// ── ScoreSparkline — mini column chart (right side of test row) ───────────────

function ScoreSparkline({ scores }: { scores: number[] }) {
    const SLOTS   = 10;           // always render 10 columns
    const W       = 88;           // total SVG width
    const H       = 36;           // total SVG height
    const barW    = 6;
    const gap     = 2;
    const rx      = 2;            // corner radius

    // Pad left with nulls for missing history
    const slots: (number | null)[] = [
        ...Array(Math.max(0, SLOTS - scores.length)).fill(null),
        ...scores.slice(-SLOTS),
    ];

    const barColor = (pct: number) =>
        pct >= 70 ? "#22c55e" : pct >= 40 ? "#eab308" : "#ef4444";

    return (
        <svg
            width={W}
            height={H}
            className="shrink-0 self-center"
            style={{ display: "block" }}
        >
            {/* baseline */}
            <line x1={0} y1={H} x2={W} y2={H} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />

            {slots.map((pct, i) => {
                const x = i * (barW + gap);
                if (pct === null) {
                    // ghost slot — just a faint thin line
                    return (
                        <rect
                            key={i}
                            x={x} y={H - 3}
                            width={barW} height={3}
                            rx={rx}
                            fill="currentColor"
                            opacity={0.1}
                        />
                    );
                }
                const h = Math.max(3, Math.round((pct / 100) * H));
                const y = H - h;
                return (
                    <g key={i}>
                        {/* background track */}
                        <rect x={x} y={0} width={barW} height={H} rx={rx} fill="currentColor" opacity={0.06} />
                        {/* value bar */}
                        <rect x={x} y={y} width={barW} height={h} rx={rx} fill={barColor(pct)} opacity={0.9} />
                        <title>{pct}%</title>
                    </g>
                );
            })}
        </svg>
    );
}
