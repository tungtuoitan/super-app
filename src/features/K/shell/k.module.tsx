import { LibraryBig, CalendarClock, ArrowRightLeft } from "lucide-react";
import { KView } from "../Components/KView";
import { KKnowledgeEditorPanel } from "../Components/KKnowledgeEditorPanel";
import { KNodeEditorPanel } from "../Components/KNodeEditorPanel/KNodeEditorPanel";
import { KMovingTab } from "../Components/VSPanel/KMovingTab";
import { useKStore } from "../store/K.store";
import { constants } from "@/utils/constants";
import type { ModuleDefinition } from "@/shell/moduleRegistry";

const KMovingTabAdapter = () => <KMovingTab />;

const K_COLOR = "#A1887F";

export const kModule: ModuleDefinition = {
    id: constants.modules.k,
    icon: LibraryBig,
    label: constants.vscode.displayNames.k,

    useBadge: () => useKStore().dailyReviewDueCount,

    SidebarView: KView,

    editorPanels: {
        [constants.vscode.tab.tabTypes.kKnowledge]: KKnowledgeEditorPanel,
        [constants.vscode.tab.tabTypes.kNode]: KNodeEditorPanel,
        [constants.vscode.tab.tabTypes.kDailyReview]: () => null, // handled separately if needed
    },

    keepAliveTabTypes: [constants.vscode.tab.tabTypes.kKnowledge],

    getTabMeta: (tab) => {
        if (tab.type === constants.vscode.tab.tabTypes.kDailyReview) {
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
