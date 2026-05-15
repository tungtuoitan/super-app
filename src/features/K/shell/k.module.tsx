import { LibraryBig, CalendarClock, ArrowRightLeft } from "lucide-react";
import { shellConstants } from "@/shell";
import { KView } from "../Components/KView";
import { KEditorPanel } from "../Components/KEditorPanel";
import { KNodeEditorPanel } from "../Components/KNodeEditorPanel/KNodeEditorPanel";
import { KMovingTab } from "../Components/KMovingTree/KMovingTab";
import { useKStore } from "../store/useK.store";
import type { ModuleDefinition } from "@/shell";
import { useKSaveActions } from "../hooks/useKSaveActions";
import { useKGlobalInit } from "../hooks/kTree/useKGlobalInit.headless";


const KMovingTabAdapter = () => <KMovingTab />;

const K_COLOR = "#A1887F";

export const kModule: ModuleDefinition = {
    id: "K",
    icon: LibraryBig,
    label: "K",

    useGlobalInit: useKGlobalInit,
    useBadge: () => useKStore().dailyReviewDueCount,

    SidebarView: KView,

    editorPanels: {
        [shellConstants.vscode.tab.tabTypes.kKnowledge]: KEditorPanel,
        [shellConstants.vscode.tab.tabTypes.kNode]: KNodeEditorPanel,
        [shellConstants.vscode.tab.tabTypes.kDailyReview]: () => null, // handled separately if needed
    },

    useSaveActions: useKSaveActions,

    keepAliveTabTypes: [shellConstants.vscode.tab.tabTypes.kKnowledge],

    tabFlags: {
        noDeletedStyle: true,
    },

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

    filterViewKey: "k",
};





