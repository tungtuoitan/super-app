import { useCallback, useEffect, useRef, useState } from "react";
import { Settings, GitBranch, BarChart2, Hash, Play, Loader2, BookDashed, BookOpen, Trophy, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardContent, useDeviceStore, useAuthStore, useDebugLog } from "@/shared";
import { KGeneral } from "./KGeneral";
import { KMarkdownEditorTab } from "./KMarkdownEditorTab";
import { KQFlowView } from "./QFlowView/KQFlowView";
import { KProgressDashboard } from "./KProgressDashboard";
import { KQList } from "./KQList";
import { useKStore } from "../store/useK.store";
import type { KWsResponse } from "../types/k.type";
import { KItemAction } from "../types/k.type";
import type { KDailySessionQuestion, KQuestion } from "../types/kQuiz.type";
import { useEditorTabBarHelper, getSideBarState } from "@/shell";
import { KQuizService } from "../service/kQuiz.service";
import { KService } from "../service/k.service";
import { useKQFlowStats } from "../hooks/qFlow/useKQFlowStats.helper";
import { sortQuestionsByFlowOrder } from "../utils/kQFlow.utils";
import { kEvents } from "../utils/kEvents.utils";
import type { KFlowQuestionsChangedDetail } from "../utils/kEvents.utils";
import { useKLoader } from "../hooks/kTree/useK.loader";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import {KDailyReviewSession} from "./KDailyReviewSession/KDailyReviewSession";

type KTab = "general" | "qflow" | "progress" | "markdown" | "qlist";

const TABS: { id: KTab; label: string; icon: React.ReactNode }[] = [
    { id: "general",  label: "General",    icon: <Settings className="h-3.5 w-3.5" /> },
    { id: "progress", label: "K Progress", icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { id: "qflow",    label: "Q Flow",     icon: <GitBranch className="h-3.5 w-3.5" /> },
    { id: "markdown", label: "Markdown",   icon: <Hash className="h-3.5 w-3.5" /> },
    { id: "qlist",    label: "Q List",     icon: <List className="h-3.5 w-3.5" /> },
];

export function KEditorPanel() {
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
    const tab = getActiveTab();
    const knowledge = tab?.data as unknown as KWsResponse;
    const isNew = knowledge.id < 0;
    const { pendingQuizTabSwitch, setPendingQuizTabSwitch, selectedItemIds, currentK, selectedKId } = useKStore();
    const { loadTree } = useKLoader();
    const { isMobile } = useDeviceStore();
    const { $user } = useAuthStore();
    const debugLog = useDebugLog();

    const visibleTabs = isMobile ? TABS.filter(t => t.id !== "general" && t.id !== "qflow" && t.id !== "qlist") : TABS;

    const [activeTab, setActiveTabLocal] = useState<KTab>(() => {
        const saved = tab?.metadata?.activeKTab as KTab | undefined;
        const hiddenOnMobile = new Set<KTab>(["general", "qflow", "qlist"]);
        if (saved && isMobile && hiddenOnMobile.has(saved)) return "markdown";
        return saved ?? (isNew ? "general" : "markdown");
    });
    const [selectedNodeId, setSelectedNodeId] = useState<number | null>(() => {
        // 1. Tab already had a saved node (e.g. page refresh / tab swap back)
        const fromMetadata = tab?.metadata?.selectedNodeId as number | undefined;
        if (fromMetadata !== undefined) return fromMetadata;
        // 2. Tab just opened via a node click — pendingQuizTabSwitch is already in scope
        //    (useKStore() is called above, so this closure captures the initial render value)
        return typeof pendingQuizTabSwitch === "number" ? pendingQuizTabSwitch : null;
    });
    const [dailyTotal, setDailyTotal] = useState(0);
    const [sessionLoading, setSessionLoading] = useState(false);
    const [reviewSession, setReviewSession] = useState<KDailySessionQuestion[] | null>(null);
    const [reviewNodeId, setReviewNodeId] = useState<number | null>(null);
    const [reviewTitle, setReviewTitle]   = useState<string>("");
    const [nodeQuestions, setNodeQuestions] = useState<KQuestion[]>([]);
    const [statusUpdating, setStatusUpdating] = useState(false);

    const node       = selectedNodeId !== null ? currentK?.flatData.find(n => n.id === selectedNodeId) : null;
    const isRootView = selectedNodeId === null || selectedNodeId === workspaceConstants.root.workspaceItemId || (selectedNodeId !== null && !node);
    const isDraft    = node?.statusCode === "draft";
    const { dueCount, totalReviewable, canReview, isMaster } = useKQFlowStats(nodeQuestions);

    // Track previous knowledge.id — initialized to the CURRENT value so the effect
    // is a no-op on first mount (and on StrictMode double-mount since the ref persists).
    // The reset only fires when the singleton tab is genuinely swapped to a different knowledge.
    const prevKnowledgeIdRef = useRef<number>(knowledge.id);

    // Persist activeTab to tab metadata
    const setActiveTab = (t: KTab) => {
        setActiveTabLocal(t);
        if (tab?.id) patchTab(tab.id, (cur) => ({ metadata: { ...cur.metadata, activeKTab: t } }));
    };

    // When knowledge changes (singleton tab swap), reset state.
    // No-op on initial mount or StrictMode double-mount (prev === current).
    useEffect(() => {
        const prev = prevKnowledgeIdRef.current;
        prevKnowledgeIdRef.current = knowledge.id;
        if (prev === knowledge.id) return; // same knowledge — skip
        const defaultTab = isNew ? "general" : "markdown";
        setActiveTabLocal(defaultTab);
        setSelectedNodeId(null);
        if (tab?.id) patchTab(tab.id, (cur) => ({ metadata: { ...cur.metadata, activeKTab: defaultTab, selectedNodeId: null } }));
    }, [knowledge.id]);

    // Track unsaved changes on tab
    useEffect(() => {
        if (tab?.id) {
            patchTab(tab.id, { hasUnsavedChanges: JSON.stringify(tab.data) !== JSON.stringify(tab.data0) });
        }
    }, [tab?.data, tab?.id]);

    // Tree deselect (click empty space) → reset to orphan view
    const prevSelectedLenRef = useRef(selectedItemIds.length);
    useEffect(() => {
        const prev = prevSelectedLenRef.current;
        prevSelectedLenRef.current = selectedItemIds.length;
        if (prev > 0 && selectedItemIds.length === 0) {
            setSelectedNodeId(null);
            if (tab?.id) patchTab(tab.id, (cur) => ({ metadata: { ...cur.metadata, selectedNodeId: null } }));
        }
    }, [selectedItemIds]);

    // pendingQuizTabSwitch carries the clicked nodeId → switch to markdown
    useEffect(() => {
        if (pendingQuizTabSwitch === undefined || isNew) return;
        const nodeId = pendingQuizTabSwitch;
        setPendingQuizTabSwitch(undefined);
        setActiveTab("markdown");
        setSelectedNodeId(nodeId);
        if (tab?.id) patchTab(tab.id, (cur) => ({ metadata: { ...cur.metadata, selectedNodeId: nodeId } }));
    }, [pendingQuizTabSwitch]);

    // Fetch daily queue count for the review button
    useEffect(() => {
        if (isNew) { setDailyTotal(0); return; }
        KQuizService._getDailyQueue(knowledge.id)
            .then(res => {
                if (res.success && res.object) {
                    setDailyTotal(res.object.reduce((s, q) => s + q.dueCount + q.newCount, 0));
                }
            })
            .catch(() => {});
    }, [knowledge.id]);

    const refreshDailyTotal = () => {
        if (isNew) return;
        KQuizService._getDailyQueue(knowledge.id)
            .then(res => {
                if (res.success && res.object) {
                    setDailyTotal(res.object.reduce((s, q) => s + q.dueCount + q.newCount, 0));
                }
            })
            .catch(() => {});
    };

    // Fetch questions for the currently selected node so we can compute the
    // Review button's badge (totalReviewable) without depending on which tab is active.
    const fetchNodeQuestions = useCallback(async () => {
        debugLog.log("KEditorPanel", "fetchNodeQuestions", { selectedNodeId: selectedNodeId ?? undefined, isNew });
        debugLog.flush();
        if (isNew || selectedNodeId === null) { setNodeQuestions([]); return; }
        try {
            const res = await KQuizService._getNodeQuestions(selectedNodeId);
            debugLog.log("KEditorPanel", "fetchNodeQuestions-result", { selectedNodeId: selectedNodeId ?? undefined, success: res.success, count: res.object?.questions?.length ?? 0 });
            debugLog.flush();
            if (res.success && res.object) setNodeQuestions(res.object.questions);
        } catch { /* silent */ }
    }, [isNew, selectedNodeId]);

    useEffect(() => { fetchNodeQuestions(); }, [fetchNodeQuestions]);

    // Cleanup: reset mobileReviewActive if component unmounts while a review session is active
    // (e.g. user navigates away mid-review without pressing Back/Complete)
    useEffect(() => {
        return () => {
            if (getSideBarState().mobileReviewActive) {
                debugLog.log("KEditorPanel", "unmount-cleanup:warn", { mobileReviewActive: true, note: "resetting stuck mobileReviewActive" });
                debugLog.flush();
                getSideBarState().setMobileReviewActive(false);
            }
        };
    }, []);

    // Track review button visibility conditions
    useEffect(() => {
        debugLog.log("KEditorPanel", "review-btn-state", {
            selectedNodeId,
            isNew,
            isRootView,
            isDraft,
            canReview,
            totalReviewable,
            dueCount,
            nodeFound: !!node,
            nodeStatus: node?.statusCode ?? null,
            isMobile,
            showNodeReviewBtn: !isNew && !isRootView && selectedNodeId !== null && !isDraft && canReview,
            showReviewAllBtn: !isNew && isRootView,
        });
        debugLog.flush();
    }, [selectedNodeId, isRootView, isDraft, canReview, totalReviewable, isNew]);

    // Re-fetch when flow operations change questions for this node
    useEffect(() => {
        const handler = (e: CustomEvent<KFlowQuestionsChangedDetail>) => {
            if (e.detail.nodeId === selectedNodeId) fetchNodeQuestions();
        };
        window.addEventListener(kEvents.flowQuestionsChanged, handler as EventListener);
        return () => window.removeEventListener(kEvents.flowQuestionsChanged, handler as EventListener);
    }, [selectedNodeId, fetchNodeQuestions]);

    const handleStartReview = async () => {
        if (sessionLoading || selectedNodeId === null) return;
        setSessionLoading(true);
        try {
            const res = await KQuizService._getDailySession(selectedNodeId);
            if (res.success && res.object && res.object.length > 0) {
                const sorted = await sortQuestionsByFlowOrder(res.object);
                if (isMobile) getSideBarState().setMobileReviewActive(true);
                setReviewNodeId(selectedNodeId);
                setReviewTitle(node?.name ?? tab?.title ?? "Daily Review");
                setReviewSession(sorted);
            }
        } catch { /* silent */ }
        finally { setSessionLoading(false); }
    };

    const handleStartReviewAll = async () => {
        if (sessionLoading || isNew) return;
        setSessionLoading(true);
        try {
            const res = await KQuizService._getKnowledgeReviewAllSession(knowledge.id);
            console.log("[ReviewAll] questions:", res.object?.map(q => ({ id: q.id, atts: q.attachments?.length ?? 0 })));
            if (res.success && res.object && res.object.length > 0) {
                if (isMobile) getSideBarState().setMobileReviewActive(true);
                setReviewNodeId(knowledge.id);
                setReviewTitle(`${tab?.title ?? "Knowledge"} — Review All`);
                setReviewSession(res.object);
            }
        } catch { /* silent */ }
        finally { setSessionLoading(false); }
    };

    const handleToggleStatus = async () => {
        if (!node || !selectedKId || statusUpdating) return;
        setStatusUpdating(true);
        try {
            const newStatus = isDraft ? "learning" : "draft";
            await KService._upsertWorkspaceItems($user.userToken, selectedKId, [{
                action: KItemAction.Update,
                id: node.id,
                nodeData: {
                    name:        node.name,
                    description: node.description ?? null,
                    color:       node.color       ?? null,
                    icon:        node.icon        ?? null,
                    statusCode:  newStatus,
                },
            }]);
            await loadTree();
        } catch { /* silent */ }
        finally { setStatusUpdating(false); }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "general":
                return <KGeneral knowledgeId={knowledge.id} tabId={tab?.id ?? ""} />;
            case "qflow":
                if (isNew) return null;
                return <KQFlowView nodeId={selectedNodeId} />;
            case "progress":
                if (isNew) return null;
                return <KProgressDashboard knowledgeId={knowledge.id} />;
            case "markdown":
                if (isNew) return null;
                return <KMarkdownEditorTab nodeId={selectedNodeId} />;
            case "qlist":
                if (isNew) return null;
                return <KQList nodeId={selectedNodeId} />;
            default:
                return null;
        }
    };

    return (
        <CardContent className="relative flex flex-col flex-1 min-h-0 w-full p-0 h-full">
            {/* Tab bar */}
            <div className="flex items-center h-10 px-2 border-b border-sa-border shrink-0">
                <div className="flex flex-1 items-center gap-1 min-w-0 overflow-x-auto">
                    {visibleTabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            disabled={t.id !== "general" && (isNew || (t.id === "progress" && selectedNodeId === null))}
                            className={cn(
                                "relative flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors duration-100",
                                activeTab === t.id
                                    ? "bg-sa-surface-2 text-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-sa-hover",
                                t.id !== "general" && (isNew || (t.id === "progress" && selectedNodeId === null)) && "opacity-50 cursor-not-allowed",
                            )}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Review button — lifted from KQFlowView toolbar */}
                {!isNew && !isRootView && selectedNodeId !== null && !isDraft && canReview && (
                    <button
                        onClick={handleStartReview}
                        disabled={sessionLoading}
                        title={`Review ${totalReviewable} question${totalReviewable !== 1 ? "s" : ""}${dueCount > 0 ? ` (${dueCount} due)` : ""}`}
                        className="mr-2 h-7 px-2.5 flex items-center gap-1.5 text-xs font-medium rounded-md bg-sa-amber text-sa-on-amber hover:bg-sa-amber/90 transition-colors duration-100 disabled:opacity-50"
                    >
                        {sessionLoading
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Play className="w-3 h-3 fill-current" />
                        }
                        {totalReviewable}
                    </button>
                )}

                {/* xxx Review All — root-level entry point (shown when no node is selected) */}
                {!isNew && isRootView && (
                    <button
                        onClick={handleStartReviewAll}
                        disabled={sessionLoading}
                        title="Review every learning question across this knowledge"
                        className="mr-2 h-7 px-2.5 flex items-center gap-1.5 text-xs font-medium rounded-md bg-sa-amber text-sa-on-amber hover:bg-sa-amber/90 transition-colors duration-100 disabled:opacity-50"
                    >
                        {sessionLoading
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Play className="w-3 h-3 fill-current" />
                        }
                        Review All
                    </button>
                )}

                {/* Draft/Learning toggle — lifted from KQFlowView toolbar */}
                {!isNew && !isRootView && selectedNodeId !== null && node && !isMobile && (
                    <button
                        onClick={handleToggleStatus}
                        disabled={statusUpdating}
                        title={isDraft ? "Set to Learning" : "Set to Draft"}
                        className={cn(
                            "mr-1 h-7 px-2.5 flex items-center gap-1.5 text-xs font-medium rounded-md border transition-colors duration-100 disabled:opacity-50",
                            isDraft
                                ? "text-muted-foreground border-sa-border-strong hover:bg-sa-hover hover:text-foreground"
                                : isMaster
                                    ? "text-sa-amber-ink border-sa-amber/40 hover:bg-sa-amber/10"
                                    : "text-foreground border-sa-border-strong hover:bg-sa-hover [&>svg]:text-sa-good",
                        )}
                    >
                        {statusUpdating
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : isDraft
                                ? <BookDashed className="w-3 h-3" />
                                : isMaster
                                    ? <Trophy className="w-3 h-3" />
                                    : <BookOpen className="w-3 h-3" />
                        }
                        {isDraft ? "Draft" : isMaster ? "Master" : "Learning"}
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 w-full overflow-hidden h-full">
                {renderTabContent()}
            </div>

            {/* Review session overlay */}
            {reviewSession && !isNew && reviewNodeId !== null && (
                <div className="absolute inset-0 z-50 bg-background flex flex-col">
                    <KDailyReviewSession
                        nodeId={reviewNodeId}
                        quizTitle={reviewTitle}
                        questions={reviewSession}
                        onComplete={() => { setReviewSession(null); setReviewNodeId(null); fetchNodeQuestions(); loadTree(); refreshDailyTotal(); if (isMobile) getSideBarState().setMobileReviewActive(false); }}
                        onBack={() => { setReviewSession(null); setReviewNodeId(null); if (isMobile) getSideBarState().setMobileReviewActive(false); }}
                    />
                </div>
            )}
        </CardContent>
    );
}
