import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, BookX, Check, ChevronDown, Eye, EyeOff, Loader2, Play, Plus, X } from "lucide-react";
import { useKTestStore } from "../../store/useKTest.store";
import { useKTestLoader } from "../../hooks/test/useKTest.loader";
import { KTestService } from "../../service/kTest.service";
import { KTestFlowProvider } from "../../store/useKTestFlow.store";
import { KQuestionFlowCanvas } from "./KQuestionFlowCanvas";
import { sortQuestionsByFlowOrder } from "../../utils/kTestFlow.utils";
import type { KTestDetail, KTestQuestion, KTestSummary } from "../../types/kTest.type";
import { kEvents } from "../../utils/kEvents.utils";
import type { KTestMovedDetail } from "../../utils/kEvents.utils";

interface KTestFlowViewProps {
    knowledgeId: number;
    onQuickTest: (detail: KTestDetail) => void;
    initialSelectedTestId?: number | null;
}

export function KTestFlowView(props: KTestFlowViewProps) {
    return (
        <KTestFlowProvider>
            <KTestFlowContent {...props} />
        </KTestFlowProvider>
    );
}

function KTestFlowContent({ knowledgeId, onQuickTest, initialSelectedTestId }: KTestFlowViewProps) {
    const { tests, isLoadingTests, activeNodeId } = useKTestStore();
    const { loadTests, createEmptyTest } = useKTestLoader();
    const lastLoadKeyRef = useRef<string | null>(null);
    const selectedTestIdRef = useRef<number | null>(initialSelectedTestId ?? null);
    const [selectedTestId, setSelectedTestId] = useState<number | null>(initialSelectedTestId ?? null);
    const setSelected = (id: number | null) => { selectedTestIdRef.current = id; setSelectedTestId(id); };
    const [questions, setQuestions] = useState<KTestQuestion[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [showDeleted, setShowDeleted] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [creatingTest, setCreatingTest] = useState(false);
    const [newTestTitle, setNewTestTitle] = useState("");
    const [creating, setCreating] = useState(false);
    const newTitleRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const visibleTests = tests.filter((t) => !t.deletedAt);
    const selectedTest = tests.find((t) => t.id === selectedTestId) ?? null;
    const deletedCount = questions.filter((q) => !!q.deletedAt).length;

    useEffect(() => {
        const key = `${knowledgeId}:${activeNodeId}`;
        if (key === lastLoadKeyRef.current) return;
        lastLoadKeyRef.current = key;
        if (knowledgeId > 0) loadTests(knowledgeId, activeNodeId ?? undefined);
    }, [knowledgeId, activeNodeId]);

    useEffect(() => {
        const handler = (e: CustomEvent<KTestMovedDetail>) => {
            if (e.detail.knowledgeId === knowledgeId && e.detail.sourceNodeId === activeNodeId)
                loadTests(knowledgeId, activeNodeId ?? undefined);
        };
        window.addEventListener(kEvents.testMoved, handler);
        return () => window.removeEventListener(kEvents.testMoved, handler);
    }, [knowledgeId, activeNodeId]);

    useEffect(() => {
        if (initialSelectedTestId) setSelected(initialSelectedTestId);
    }, [initialSelectedTestId]);
    console.log('KTestFlowContent rendered');

    useEffect(() => {
        if (isLoadingTests) return;
        // Use ref to avoid stale closure — check current selectedTestId, not captured one
        if (selectedTestIdRef.current && visibleTests.some((t) => t.id === selectedTestIdRef.current)) return;
        setSelected(visibleTests[0]?.id ?? null);
    }, [isLoadingTests, tests]);

    const loadDetail = async (testId: number) => {
        setLoadingDetail(true);
        try {
            const res = await KTestService._getTestDetail(knowledgeId, testId);
            if (res.success && res.object) setQuestions(res.object.questions);
        } finally { setLoadingDetail(false); }
    }

    useEffect(() => {
        if (!selectedTestId) { setQuestions([]); return; }
        loadDetail(selectedTestId);
    }, [selectedTestId]);

    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = (e: MouseEvent) => { if (!dropdownRef.current?.contains(e.target as Node)) setDropdownOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [dropdownOpen]);

    const handleStart = async (test: KTestSummary) => {
        const res = await KTestService._getTestDetail(knowledgeId, test.id);
        if (res.success && res.object) {
            const active = res.object.questions.filter((q) => !q.deletedAt && q.isActive);
            const sorted = await sortQuestionsByFlowOrder(active);
            onQuickTest({ ...res.object, questions: sorted });
        }
    };

    // const handleCreateTest = async () => {
    //     if (!newTestTitle.trim() || creating) return;
    //     setCreating(true);
    //     try {
    //         const test = await createEmptyTest(knowledgeId, newTestTitle.trim(), activeNodeId ?? undefined);
    //         setNewTestTitle("");
    //         setCreatingTest(false);
    //         if (test) setSelected((test as { id: number }).id);
    //     } finally { setCreating(false); }
    // };

    const handleQuestionsChanged = () => {
        if (selectedTestId) loadDetail(selectedTestId);
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar: [dropdown][+] [Start]          [Question] [eye] */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-800/60 shrink-0">
                {/* Test selector */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen((v) => !v)}
                        className="flex items-center gap-1.5 h-7 px-2.5 text-xs rounded border border-zinc-700 bg-zinc-900/60 hover:border-zinc-500 transition-colors min-w-[130px] max-w-[220px]"
                    >
                        <span className="flex-1 text-left truncate">
                            {selectedTest?.title ?? (isLoadingTests ? "Loading…" : "No test")}
                        </span>
                        <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
                    </button>
                    {dropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[200px] max-h-64 overflow-y-auto">
                            {tests.length === 0 && <p className="text-xs text-zinc-600 px-3 py-2">No tests</p>}
                            {tests.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => { setSelected(t.id); setDropdownOpen(false); }}
                                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-zinc-800 transition-colors ${t.id === selectedTestId ? "text-blue-400" : t.deletedAt ? "text-zinc-600" : "text-zinc-200"}`}
                                >
                                    <span className={`flex-1 truncate ${t.deletedAt ? "line-through opacity-50" : ""}`}>{t.title}</span>
                                    <span className="text-zinc-600 shrink-0">{t.questionCount}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add test — inline form or + button */}
                {/* {creatingTest ? (
                    <div className="flex items-center gap-1">
                        <input
                            ref={newTitleRef}
                            value={newTestTitle}
                            onChange={(e) => setNewTestTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleCreateTest(); if (e.key === "Escape") cancelCreateTest(); }}
                            placeholder="Test name…"
                            disabled={creating}
                            autoFocus
                            className="text-xs bg-zinc-900 border border-zinc-700 rounded px-2 h-7 outline-none focus:border-zinc-500 w-32"
                        />
                        <button onClick={handleCreateTest} disabled={creating || !newTestTitle.trim()} className="text-green-500 hover:text-green-400 disabled:opacity-40 p-1">
                            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                        <button onClick={cancelCreateTest} className="text-zinc-500 hover:text-zinc-300 p-1">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setCreatingTest(true)}
                        title="New test"
                        className="h-7 w-7 flex items-center justify-center rounded border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                )} */}

                {/* Start */}
                {selectedTest && (
                    <button
                        onClick={() => handleStart(selectedTest)}
                        className="h-7 px-2 flex items-center gap-1 text-xs text-zinc-400 hover:text-green-400 border border-zinc-700 hover:border-green-700 rounded transition-colors"
                    >
                        <Play className="w-3 h-3" /> Quick Test
                    </button>
                )}

                {/* Activate / Deactivate */}
                {selectedTest && (
                    <button
                        onClick={async () => {
                            const next = selectedTest.status === "learning" || selectedTest.status === "mastered" ? "inactive" : "learning";
                            await KTestService._updateTestStatus(knowledgeId, selectedTest.id, next);
                            await loadTests(knowledgeId, activeNodeId ?? undefined);
                        }}
                        title={
                            selectedTest.status === "learning" ? "Learning — click to deactivate" :
                            selectedTest.status === "mastered" ? "Mastered — click to deactivate" :
                            "Inactive — click to activate"
                        }
                        className={`h-7 w-7 flex items-center justify-center rounded border transition-colors ${
                            selectedTest.status === "learning" ? "text-blue-400 border-blue-800/60 hover:text-blue-300" :
                            selectedTest.status === "mastered" ? "text-purple-400 border-purple-800/60 hover:text-purple-300" :
                            "text-zinc-600 border-zinc-800 hover:text-zinc-400 hover:border-zinc-600"
                        }`}
                    >
                        {selectedTest.status === "learning" || selectedTest.status === "mastered"
                            ? <BookOpen className="w-3.5 h-3.5" />
                            : <BookX className="w-3.5 h-3.5" />}
                    </button>
                )}

                {/* Right side */}
                <div className="ml-auto flex items-center gap-1.5">
                    {/* {selectedTestId && (
                        <Button
                            size="sm" variant="outline" className="h-7 gap-1 text-xs"
                            onClick={() => window.dispatchEvent(new CustomEvent("kflow:add-question"))}
                        >
                            <Plus className="w-3 h-3" /> Question
                        </Button>
                    )} */}

                    {deletedCount > 0 && (
                        <button
                            onClick={() => setShowDeleted((v) => !v)}
                            title={showDeleted ? "Hide deleted questions" : `Show ${deletedCount} deleted question${deletedCount !== 1 ? "s" : ""}`}
                            className={`h-7 px-2 flex items-center gap-1 text-xs rounded border transition-colors ${
                                showDeleted
                                    ? "text-red-400 border-red-800/60 bg-red-950/20"
                                    : "text-zinc-600 border-zinc-800 hover:text-zinc-400 hover:border-zinc-600"
                            }`}
                        >
                            {showDeleted ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{deletedCount}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Flow graph — never unmount during reload to prevent fitView zoom reset */}
            {isLoadingTests ? (
                <div className="flex items-center justify-center flex-1">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="flex-1 min-h-0 relative">
                    <KQuestionFlowCanvas
                        selectedTestId={selectedTestId}
                        questions={questions}
                        knowledgeId={knowledgeId}
                        showDeleted={showDeleted}
                        onQuestionsChanged={handleQuestionsChanged}
                    />
                    {loadingDetail && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
