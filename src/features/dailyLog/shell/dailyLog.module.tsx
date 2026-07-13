import { CalendarDays } from "lucide-react";
import { shellConstants } from "@/shell";
import type { ModuleDefinition, BaseTab, SaveActions } from "@/shell";
import { DailyLogView } from "../Components/DailyLogView";
import { DailyLogEditorPanel } from "../Components/DailyLogEditorPanel";
import { useDailyLogSaveActions } from "../hooks/useDailyLogSaveActions";

const DailyLogEditorPanelAdapter = () => <DailyLogEditorPanel />;

function useSaveActions(): SaveActions {
    const { onSave } = useDailyLogSaveActions();
    return {
        handles: (tabType: string) => tabType === shellConstants.vscode.tab.tabTypes.dailyLog,
        onSave: async (_tab: BaseTab) => { await onSave(); },
    };
}

export const dailyLogModule: ModuleDefinition = {
    id: "DailyLog",
    icon: CalendarDays,
    label: "Daily Log",
    hideRightSideBarFilter: true,

    useSaveActions,

    SidebarView: DailyLogView,

    editorPanels: {
        [shellConstants.vscode.tab.tabTypes.dailyLog]: DailyLogEditorPanelAdapter,
    },

    getTabMeta: () => ({
        icon: <CalendarDays className="w-4 h-4" style={{ color: "#8b5cf6" }} />,
        color: "#8b5cf6",
    }),

    filterViewKey: null,
};
