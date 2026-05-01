import { LibraryBig, CalendarClock, ArrowRightLeft } from "lucide-react";
import { shellConstants } from "@/shell";
import { KView } from "../Components/KView";
import { KKnowledgeEditorPanel } from "../Components/KKnowledgeEditorPanel";
import { KNodeEditorPanel } from "../Components/KNodeEditorPanel/KNodeEditorPanel";
import { KMovingTab } from "../Components/KMovingTree/KMovingTab";
import { useKStore } from "../store/K.store";
import { constants, menuContextRegistry } from "@/shared";
import type { ModuleDefinition } from "@/shell";
import { KNodeMenu } from "../contexts/menu/KNodeMenu";
import { KNodePanelCardMenu } from "../contexts/menu/KNodePanelCardMenu";
import { KKnowledgeMenu } from "../contexts/menu/KKnowledgeMenu";
import { KTestFlowMenu } from "../contexts/menu/KTestFlowMenu";
import { KNodePanelBlankMenu } from "../contexts/menu/KNodePanelBlankMenu";

menuContextRegistry.register({ handles: ["k-node"],               component: KNodeMenu });
menuContextRegistry.register({ handles: ["k-node-panel-card"],    component: KNodePanelCardMenu });
menuContextRegistry.register({ handles: ["k-knowledge-selector"], component: KKnowledgeMenu });
menuContextRegistry.register({ handles: ["k-test-flow"],          component: KTestFlowMenu });
menuContextRegistry.register({ handles: ["k-node-panel-blank"],   component: KNodePanelBlankMenu });

const KMovingTabAdapter = () => <KMovingTab />;

const K_COLOR = "#A1887F";

export const kModule: ModuleDefinition = {
    id: "K",
    icon: LibraryBig,
    label: "K",

    useBadge: () => useKStore().dailyReviewDueCount,

    SidebarView: KView,

    editorPanels: {
        [shellConstants.vscode.tab.tabTypes.kKnowledge]: KKnowledgeEditorPanel,
        [shellConstants.vscode.tab.tabTypes.kNode]: KNodeEditorPanel,
        [shellConstants.vscode.tab.tabTypes.kDailyReview]: () => null, // handled separately if needed
    },

    keepAliveTabTypes: [shellConstants.vscode.tab.tabTypes.kKnowledge],

    getTabMeta: (tab) => {
        if (tab.type === shellConstants.vscode.tab.tabTypes.kDailyReview) {
            return { icon: <CalendarClock className="w-4 h-4" style={{ color: K_COLOR }} />, color: K_COLOR };
        }
        return { icon: <LibraryBig className="w-4 h-4" style={{ color: K_COLOR }} />, color: K_COLOR };
    },

    panelTabs: [
        {
            id: "moving",
            label: "Moving",
            icon: ArrowRightLeft,
            Content: KMovingTabAdapter,
        },
    ],
};




