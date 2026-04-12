import { LibraryBig, ArrowRightLeft } from "lucide-react";
import { KView } from "../Components/KView";
import { KKnowledgeEditorPanel } from "../Components/KKnowledgeEditorPanel";
import { KNodeEditorPanel } from "../Components/KNodeEditorPanel/KNodeEditorPanel";
import { KMovingTab } from "../Components/VSPanel/KMovingTab";
import { useKStore } from "../store/K.store";
import { constants } from "@/utils/constants";
import type { ModuleDefinition } from "@/shell/moduleRegistry";

const KMovingTabAdapter = () => <KMovingTab />;

export const kModule: ModuleDefinition = {
    id: constants.modules.k,
    icon: LibraryBig,
    label: constants.vscode.displayNames.k,

    useBadge: () => useKStore().dailyReviewDueCount,

    SidebarView: KView,

    editorPanels: {
        [constants.vscode.tab.tabTypes.kKnowledge]: KKnowledgeEditorPanel,
        [constants.vscode.tab.tabTypes.kNode]: KNodeEditorPanel,
    },

    /** Keep KKnowledgeEditorPanel mounted to preserve KTestStore context */
    keepAliveTabTypes: [constants.vscode.tab.tabTypes.kKnowledge],

    panelTabs: [
        {
            id: "moving",
            label: "Moving",
            icon: ArrowRightLeft,
            Content: KMovingTabAdapter,
        },
    ],
};
