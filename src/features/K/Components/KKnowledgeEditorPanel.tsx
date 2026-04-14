import { useEffect, useState } from "react";
import { Settings, Columns, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardContent } from "@/shared/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { useEditorTabsStore } from "@/store/index";
import { KKnowledgeGeneral } from "./KKnowledgeGeneral";
import { KTestKanbanView } from "./KTestKanbanView/KTestKanbanView";
import { KTestSession } from "./KTestSession/KTestSession";
import { KTestRecordSession } from "./KTestRecordSession/KTestRecordSession";
import { KTestDetail } from "./KTestDetail/KTestDetail";
import { KMarkdownImportPanel } from "./KMarkdownImportPanel/KMarkdownImportPanel";
import { KDailyReviewPanel } from "./KDailyReview/KDailyReviewPanel";
import { KRetentionBadge } from "./small/KRetentionBadge";
import { KTestStore, useKTestStoreValues } from "../store/useKTest.store";
import { KTestService } from "../service/kTest.service";
import { useKStore } from "../store/K.store";
import type { BaseTab } from "@/types/editor/tab.types";
import type { KWsResponse } from "../types/K.types";
import type { KTestDetail as KTestDetailType } from "../types/kTest.type";
import type { KItemV2 } from "../types/K-v2.types";

interface KKnowledgeEditorPanelProps {
    tab: BaseTab;
}

type SessionState = { detail: KTestDetailType; mode: "standard" | "record" } | null;

type PanelView =
    | { kind: "none" }
    | { kind: "testDetail"; testId: number };

type KTab = "testKanban" | "general" | "dailyReview";

const TABS: { id: KTab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "GENERAL", icon: <Settings className="h-4 w-4" /> },
    { id: "testKanban", label: "TESTS", icon: <Columns className="h-4 w-4" /> },
    { id: "dailyReview", label: "DAILY", icon: <CalendarClock className="h-4 w-4" /> },
];

export function KKnowledgeEditorPanel({ tab }: KKnowledgeEditorPanelProps) {
    const { setOpenTabs } = useEditorTabsStore();
    const knowledge = tab.data as unknown as KWsResponse;
    const isNew     = knowledge.id < 0;
    const kTestStoreValues = useKTestStoreValues();
    const { currentK, pendingImportNodeId, setPendingImportNodeId, pendingQuizTabSwitch, setPendingQuizTabSwitch, allK } = useKStore();

    const [activeTab, setActiveTabLocal]           = useState<KTab>(() => {
        const saved = tab.metadata?.activeKTab as KTab | undefined;
        return saved ?? (isNew ? "general" : "testKanban");
    });
    const [session, setSession]                   = useState<SessionState>(null);
    const [view, setView]                         = useState<PanelView>({ kind: "none" });
    const [isImportOpen, setIsImportOpen]         = useState(false);
    const [importParentNode, setImportParentNode] = useState<KItemV2 | null>(null);
    const [dailyDueCount, setDailyDueCount]      = useState(0);

    // Load daily due count for badge (global — all knowledges)
    useEffect(() => {
        if (isNew) return;
        KTestService._getGlobalDailyQueue()
            .then(res => {
                if (res.success && res.object) {
                    setDailyDueCount(res.object.filter(q => q.dueCount + q.newCount > 0).length);
                }
            })
            .catch(() => {});
    }, [knowledge.id, isNew]);

    // Persist activeTab to tab.metadata so it survives unmount/remount
    const setActiveTab = (t: KTab) => {
        setActiveTabLocal(t);
        setOpenTabs((prev) =>
            prev.map((tab2) =>
                tab2.id === tab.id ? { ...tab2, metadata: { ...tab2.metadata, activeKTab: t } } : tab2
            ),
        );
    };

    // When knowledge changes (singleton tab swap), reset state
    useEffect(() => {
        setSession(null);
        setView({ kind: "none" });
        const defaultTab = isNew ? "general" : "testKanban";
        setActiveTabLocal(defaultTab);
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === tab.id ? { ...t, metadata: { ...t.metadata, activeKTab: defaultTab } } : t
            ),
        );
    }, [knowledge.id]);

    // Track unsaved changes on tab
    useEffect(() => {
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === tab.id
                    ? { ...t, hasUnsavedChanges: JSON.stringify(t.data) !== JSON.stringify(t.data0) }
                    : t,
            ),
        );
    }, [tab.data, tab.id, setOpenTabs]);

    // pendingQuizTabSwitch set by tree node click → reload tests filtered by that node
    useEffect(() => {
        if (pendingQuizTabSwitch === undefined || isNew) return;
        const nodeId = pendingQuizTabSwitch;
        setPendingQuizTabSwitch(undefined);
        // Cancel any ongoing test session / detail view
        setSession(null);
        setView({ kind: "none" });
        setActiveTab("testKanban");
        // Only set the activeNodeId — KTestKanbanView's own effect will call loadTests
        kTestStoreValues.setActiveNodeId(nodeId ?? null);
    }, [pendingQuizTabSwitch]);

    // pendingImportNodeId set by tree right-click → open Import dialog
    useEffect(() => {
        if (pendingImportNodeId === undefined) return;
        const node = pendingImportNodeId !== null
            ? (currentK?.flatData.find(n => n.id === pendingImportNodeId) ?? null)
            : null;
        setImportParentNode(node);
        setIsImportOpen(true);
        setPendingImportNodeId(undefined);
    }, [pendingImportNodeId]);

    const handleStartTest       = (testDetail: KTestDetailType) => setSession({ detail: testDetail, mode: "standard" });
    const handleStartRecordTest = (testDetail: KTestDetailType) => setSession({ detail: testDetail, mode: "record" });
    const handleSessionEnd      = () => setSession(null);

    // ── Tab content ───────────────────────────────────────────────────────────

    const renderTabContent = () => {
        // Active test session overlays everything
        if (!isNew && session) {
            return session.mode === "record" ? (
                <KTestRecordSession
                    knowledgeId={knowledge.id}
                    testId={session.detail.id}
                    questions={session.detail.questions}
                    onComplete={handleSessionEnd}
                    onBack={handleSessionEnd}
                />
            ) : (
                <KTestSession
                    knowledgeId={knowledge.id}
                    testId={session.detail.id}
                    questions={session.detail.questions}
                    onComplete={handleSessionEnd}
                    onBack={handleSessionEnd}
                />
            );
        }

        switch (activeTab) {
            case "general":
                return <KKnowledgeGeneral knowledgeId={knowledge.id} tabId={tab.id} />;
            case "testKanban":
                if (isNew) return null;
                // if (view.kind === "testDetail") {
                //     return (
                //         <KTestDetail
                //             knowledgeId={knowledge.id}
                //             testId={view.testId}
                //             onBack={() => setView({ kind: "none" })}
                //             onStart={(detail) => handleStartTest(detail)}
                //         />
                //     );
                // }
                return (
                    <KTestKanbanView
                        knowledgeId={knowledge.id}
                        onStartTest={handleStartTest}
                        onStartRecordTest={handleStartRecordTest}
                    />
                );
            case "dailyReview":
                if (isNew) return null;
                return (
                    <KDailyReviewPanel
                        onComplete={() => {
                            setActiveTab("testKanban");
                            KTestService._getGlobalDailyQueue()
                                .then(res => {
                                    if (res.success && res.object) setDailyDueCount(res.object.filter(q => q.dueCount + q.newCount > 0).length);
                                })
                                .catch(() => {});
                        }}
                        onNavigateToTest={(targetKnowledgeId) => {
                            if (targetKnowledgeId === knowledge.id) {
                                // Same knowledge — switch sub-tab + reset node filter
                                kTestStoreValues.setActiveNodeId(null);
                                setActiveTab("testKanban");
                            } else {
                                // Different knowledge — swap tab data, then pendingQuizTabSwitch triggers testKanban
                                const targetK = allK.find(k => k.id === targetKnowledgeId);
                                if (targetK) {
                                    setOpenTabs(prev => prev.map(t =>
                                        t.id === tab.id
                                            ? { ...t, data: targetK, data0: targetK, title: targetK.name || "Knowledge", hasUnsavedChanges: false }
                                            : t
                                    ));
                                    setPendingQuizTabSwitch(null);
                                }
                            }
                        }}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <KTestStore.Provider value={kTestStoreValues}>
            <CardContent className="flex flex-col flex-1 min-h-0 w-full p-0 h-full">
                {/* Tab bar */}
                <div className="flex items-center border-b-2 border-primary/20 bg-muted/20 shrink-0">
                    <div className="flex flex-1">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                disabled={t.id !== "general" && isNew}
                                className={cn(
                                    "relative flex items-center gap-2 px-5 py-3 text-xs font-bold transition-colors tracking-wider",
                                    "border-b-3 -mb-[2px]",
                                    activeTab === t.id
                                        ? "border-primary text-primary bg-primary/5"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    t.id !== "general" && isNew && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {t.icon}
                                {t.label}
                                {t.id === "dailyReview" && dailyDueCount > 0 && (
                                    <span className="min-w-[16px] h-4 flex items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-bold px-1 leading-none">
                                        {dailyDueCount > 99 ? "99+" : dailyDueCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    {!isNew && <KRetentionBadge knowledgeId={knowledge.id} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 w-full overflow-hidden h-full">
                    {renderTabContent()}
                </div>
            </CardContent>

            {/* ── Import popup — triggered by right-click in tree ── */}
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
                        <DialogTitle className="text-sm font-semibold">Import from Markdown</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-auto">
                        {!isNew && (
                            <KMarkdownImportPanel
                                knowledgeId={knowledge.id}
                                initialParentNode={importParentNode}
                                onSuccess={() => {
                                    setIsImportOpen(false);
                                    const nodeId = kTestStoreValues.activeNodeId ?? undefined;
                                    kTestStoreValues.setIsLoadingTests(true);
                                    KTestService._getTests(knowledge.id, nodeId)
                                        .then(tests => kTestStoreValues.setTests(tests))
                                        .catch(e => console.error("reload tests after import failed", e))
                                        .finally(() => kTestStoreValues.setIsLoadingTests(false));
                                }}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </KTestStore.Provider>
    );
}
