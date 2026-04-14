import { Boxes, Box, BarChart3, ArrowRightLeft } from "lucide-react";
import { WorkspaceView } from "../Components/WorkspaceView";
import { WsEditorPanel } from "@/Components/Workspace/WsEditorPanel";
import { MovingTab } from "../Components/VSPanel/MovingTab";
import { constants } from "@/utils/constants";
import type { ModuleDefinition } from "@/shell/moduleRegistry";

const MovingTabAdapter = () => <MovingTab />;

const TAB_COLORS: Record<string, string> = {
    [constants.vscode.tab.tabTypes.workspace]: "#a78bfa",
    [constants.vscode.tab.tabTypes.trackingGraph]: "#22c55e",
};

export const workspaceModule: ModuleDefinition = {
    id: constants.modules.workspace,
    icon: Boxes,
    label: constants.vscode.displayNames.workspace,

    SidebarView: WorkspaceView,

    editorPanels: {
        [constants.vscode.tab.tabTypes.workspace]: WsEditorPanel,
    },

    getTabMeta: (tab) => {
        const color = TAB_COLORS[tab.type] ?? "#9ca3af";
        const Icon = tab.type === constants.vscode.tab.tabTypes.trackingGraph ? BarChart3 : Box;
        return { icon: <Icon className="w-4 h-4" style={{ color }} />, color };
    },

    panelTabs: [
        {
            id: "moving",
            label: "Moving",
            icon: ArrowRightLeft,
            Content: MovingTabAdapter,
        },
    ],
};
