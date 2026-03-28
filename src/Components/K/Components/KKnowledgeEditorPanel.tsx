/**
 * KKnowledgeEditorPanel — main editor panel for a knowledge base tab.
 *
 * Layout MIRRORS TaskDetailContent exactly:
 *   flex flex-col h-full overflow-hidden px-6 py-4
 *   └─ flex flex-1 min-h-0
 *      ├─ Left (flex-[3]): CardContent → header fields (shrink-0) + tab section (flex-1 min-h-0)
 *      └─ Right (flex-1):  CardContent space-y-4 → metadata (scrolls independently)
 *
 * Tab bar mirrors TaskDetailSection:
 *   Custom buttons with per-tab colour, no shadcn Tabs component.
 */

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, HelpCircle, FlaskConical, Library } from "lucide-react";
import { CardContent } from "@/Components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { useEditorTabsStore } from "@/store/index";
import { KKnowledgeGeneral } from "./KKnowledgeGeneral";
import { KTestGrid } from "./KTestGrid/KTestGrid";
import { KTestSession } from "./KTestSession/KTestSession";
import { KTestDetail } from "./KTestDetail/KTestDetail";
import { KMarkdownImportPanel } from "./KMarkdownImportPanel/KMarkdownImportPanel";
import { KNodeEditorPanel } from "./KNodeEditorPanel/KNodeEditorPanel";
import { KTestStore, useKTestStoreValues } from "../store/useKTest.store";
import { useKStore } from "../store/K.store";
import { $traverse } from "../hooks/Ktree.miniHelper";
import { kconstants } from "../utils/K.Constants";
import type { BaseTab } from "@/types/editor/tab.types";
import type { KWsResponse } from "../types/K.types";
import type { KTestDetail as KTestDetailType } from "../types/kTest.type";
import type { KItemV2 } from "../types/K-v2.types";
import { ICON_MAP } from "../shared/icons/icon.config";
import type { IconType } from "../shared/icons/icon.types";

// ── Tab config (mirrors BUILTIN_TABS / TAB_COLORS pattern) ──────────────────

type KEditorTab = "general" | "quiz" | "tests";

const EDITOR_TABS: Array<{ key: KEditorTab; label: string; icon: React.ElementType }> = [
    { key: "general", label: "K General", icon: BookOpen },
    { key: "tests",   label: "Tests",   icon: FlaskConical },
    { key: "quiz",    label: "Quiz",    icon: HelpCircle },
];

const TAB_COLORS: Record<KEditorTab, { active: string }> = {
    general: { active: "border-emerald-500 text-emerald-500" },
    quiz:    { active: "border-amber-500  text-amber-500" },
    tests:   { active: "border-sky-500    text-sky-500" },
};

// ── Types ────────────────────────────────────────────────────────────────────

interface KKnowledgeEditorPanelProps {
    tab: BaseTab;
}

type SessionState = KTestDetailType | null;

type PanelView =
    | { kind: "none" }
    | { kind: "testDetail"; testId: number };

// ── Component ────────────────────────────────────────────────────────────────

export function KKnowledgeEditorPanel({ tab }: KKnowledgeEditorPanelProps) {
    const { setOpenTabs } = useEditorTabsStore();
    const knowledge = tab.data as unknown as KWsResponse;
    const isNew     = knowledge.id < 0;
    const kTestStoreValues = useKTestStoreValues();
    const { treeData, currentK, pendingImportNodeId, setPendingImportNodeId, pendingQuizTabSwitch, setPendingQuizTabSwitch } = useKStore();

    const [session, setSession]                   = useState<SessionState>(null);
    const [view, setView]                         = useState<PanelView>({ kind: "none" });
    const [activeTab, setActiveTab]               = useState<KEditorTab>("general");
    const [isImportOpen, setIsImportOpen]         = useState(false);
    const [importParentNode, setImportParentNode] = useState<KItemV2 | null>(null);
    const [pendingTestId, setPendingTestId]       = useState<number | null>(null);
    // ID of the node the user clicked in the tree — drives quizTab's rootNode
    const [quizNodeId, setQuizNodeId]             = useState<number | null>(null);

    // nodeId → name map for test detail
    const nodeMap = useMemo<Record<number, string>>(() => {
        const map: Record<number, string> = {};
        $traverse(treeData).forEach(node => { map[node.data.id] = node.name; });
        return map;
    }, [treeData]);

    // Synthetic tab for KNodeEditorPanel — when quizNodeId is set, root = clicked node; otherwise virtual knowledge root
    const quizTab = useMemo((): BaseTab => {
        const clickedNode = quizNodeId !== null
            ? currentK?.flatData.find(n => n.id === quizNodeId) ?? null
            : null;

        const rootNode: KItemV2 = clickedNode ?? {
            id:          kconstants.workspace.root.workspaceItemId,
            knowledgeId: knowledge.id,
            parentId:    null,
            name:        knowledge.name,
            pathIds:     "/",
            pathDepth:   0,
            createdAt:   knowledge.createdAt,
        };
        return {
            id:                `k-quiz-${knowledge.id}`,
            type:              "k-node",
            data:              rootNode,
            data0:             rootNode,
            title:             knowledge.name,
            hasUnsavedChanges: false,
        };
    }, [knowledge.id, knowledge.name, knowledge.createdAt, quizNodeId, currentK?.flatData]);

    // Node hiện đang drive Quiz tab (full object để lấy icon/color/nodeType)
    const quizNode = useMemo(() => {
        if (quizNodeId === null) return null;
        return currentK?.flatData.find(n => n.id === quizNodeId) ?? null;
    }, [quizNodeId, currentK?.flatData]);

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

    // pendingQuizTabSwitch set by node click in tree → switch to Quiz tab + navigate to that node
    useEffect(() => {
        if (pendingQuizTabSwitch === undefined) return;
        if (!isNew) {
            setQuizNodeId(pendingQuizTabSwitch);   // drives quizTab rootNode + remount key
            if (activeTab !== "tests") setActiveTab("quiz");
        }
        setPendingQuizTabSwitch(undefined);
    }, [pendingQuizTabSwitch]);

    const handleStartTest  = (testDetail: KTestDetailType) => {
        setSession(testDetail);
        setActiveTab("tests");
    };
    const handleSessionEnd = () => setSession(null);

    // ── Derived ──────────────────────────────────────────────────────────────

    const quizNodeName = quizNode?.name ?? null;

    const fmt = (iso?: string | null) => {
        if (!iso) return "—";
        return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    // ── Main panel ───────────────────────────────────────────────────────────

    return (
        <KTestStore.Provider value={kTestStoreValues}>
    
            <CardContent className="flex flex-col flex-1 min-h-0 space-y-4 w-full">
                {/* Tab section — fills remaining height, mirrors TaskDetailSection */}
                <div className="flex-1 min-h-0 flex flex-col w-full">

                {/* ── Node header — luôn hiện khi có node được chọn, bất kể tab nào ── */}
                

                    {/* ── Tab Bar — identical button style to TaskDetailSection ── */}
                    <div className="flex items-start shrink-0 gap-1 relative">
                        <div className="flex flex-wrap items-center min-w-0 flex-1">
                            {EDITOR_TABS.map((t) => {
                                const Icon     = t.icon;
                                const isActive = activeTab === t.key;
                                const disabled = isNew && t.key !== "general";
                                return (
                                    <button
                                        key={t.key}
                                        onClick={() => !disabled && setActiveTab(t.key)}
                                        disabled={disabled}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                                            isActive
                                                ? TAB_COLORS[t.key].active
                                                : "border-transparent text-muted-foreground hover:text-foreground",
                                        )}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        <span className={cn("truncate", t.key === "quiz" && quizNodeName ? "max-w-[140px]" : "")}>
                                            {t.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Section Panels — hidden pattern from TaskDetailSection ── */}
                    <div className="flex-1 min-h-0 w-full ">

                        <div className={cn("h-full overflow-hidden w-full", activeTab !== "general" && "hidden")}>
                            <KKnowledgeGeneral knowledgeId={knowledge.id} tabId={tab.id} />
                        </div>

                        <div className={cn("h-full overflow-hidden w-full", activeTab !== "quiz" && "hidden")}>
                            {!isNew && <KNodeEditorPanel key={quizNodeId ?? 0} tab={quizTab} />}
                        </div>

                        <div className={cn("h-full overflow-y-auto w-full", activeTab !== "tests" && "hidden")}>
                            {!isNew && (
                                session ? (
                                    <KTestSession
                                        knowledgeId={knowledge.id}
                                        testId={session.id}
                                        questions={session.questions}
                                        onComplete={handleSessionEnd}
                                        onBack={handleSessionEnd}
                                    />
                                ) : view.kind === "testDetail" ? (
                                    <KTestDetail
                                        knowledgeId={knowledge.id}
                                        testId={view.testId}
                                        nodeMap={nodeMap}
                                        onBack={() => setView({ kind: "none" })}
                                        onStart={(detail) => handleStartTest(detail)}
                                    />
                                ) : (
                                    <KTestGrid
                                        knowledgeId={knowledge.id}
                                        pendingStartTestId={pendingTestId}
                                        onPendingStartHandled={() => setPendingTestId(null)}
                                        onStartTest={handleStartTest}
                                        onViewDetail={(testId) => setView({ kind: "testDetail", testId })}
                                    />
                                )
                            )}
                        </div>

                    </div>
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
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </KTestStore.Provider>
    );
}
