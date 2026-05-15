import { useEffect, useRef, useState } from "react";
import { Settings, GitBranch, BarChart2, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardContent } from "@/shared";
import { KGeneral } from "./KGeneral";
import { KMarkdownEditorTab } from "./KMarkdownEditorTab";
import { KQFlowView } from "./QFlowView/KQFlowView";
import { KProgressDashboard } from "./KProgressDashboard";
import { KDailyReviewSession } from "./KDailyReviewSession";
import { useKStore } from "../store/useK.store";
import type { KWsResponse } from "../types/k.type";
import type { KDailySessionQuestion } from "../types/kQuiz.type";
import { useEditorTabBarHelper } from "@/shell";
import { KQuizService } from "../service/kQuiz.service";

type KTab = "general" | "qflow" | "progress" | "markdown";

const TABS: { id: KTab; label: string; icon: React.ReactNode }[] = [
    { id: "general",  label: "GENERAL",    icon: <Settings className="h-4 w-4" /> },
    { id: "progress", label: "K PROGRESS", icon: <BarChart2 className="h-4 w-4" /> },
    { id: "qflow",    label: "Q FLOW",     icon: <GitBranch className="h-4 w-4" /> },
    { id: "markdown", label: "MARKDOWN",   icon: <Hash className="h-4 w-4" /> },
];

export function KEditorPanel() {
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
    const tab = getActiveTab();
    const knowledge = tab?.data as unknown as KWsResponse;
    const isNew = knowledge.id < 0;
    const { pendingQuizTabSwitch, setPendingQuizTabSwitch, selectedItemIds } = useKStore();

    const [activeTab, setActiveTabLocal] = useState<KTab>(() => {
        const saved = tab?.metadata?.activeKTab as KTab | undefined;
        return saved ?? (isNew ? "general" : "qflow");
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
        const defaultTab = isNew ? "general" : "qflow";
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

    // pendingQuizTabSwitch carries the clicked nodeId → switch to qflow
    useEffect(() => {
        if (pendingQuizTabSwitch === undefined || isNew) return;
        const nodeId = pendingQuizTabSwitch;
        setPendingQuizTabSwitch(undefined);
        setActiveTab("qflow");
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
            default:
                return null;
        }
    };

    return (
        <CardContent className="relative flex flex-col flex-1 min-h-0 w-full p-0 h-full">
            {/* Tab bar */}
            <div className="flex items-center border-b-2 border-primary/20 bg-muted/20 shrink-0">
                <div className="flex flex-1">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            disabled={t.id !== "general" && (isNew || (t.id === "progress" && selectedNodeId === null))}
                            className={cn(
                                "relative flex items-center gap-2 px-5 py-3 text-xs font-bold transition-colors tracking-wider",
                                "border-b-3 -mb-[2px]",
                                activeTab === t.id
                                    ? "border-primary text-primary bg-primary/5"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                t.id !== "general" && (isNew || (t.id === "progress" && selectedNodeId === null)) && "opacity-50 cursor-not-allowed",
                            )}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 w-full overflow-hidden h-full">
                {renderTabContent()}
            </div>

            {/* Review session overlay */}
            {reviewSession && !isNew && (
                <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
                    <KDailyReviewSession
                        nodeId={knowledge.id}
                        quizTitle={tab?.title ?? "Daily Review"}
                        questions={reviewSession}
                        onComplete={() => { setReviewSession(null); refreshDailyTotal(); }}
                        onBack={() => setReviewSession(null)}
                    />
                </div>
            )}
        </CardContent>
    );
}
