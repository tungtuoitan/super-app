import { Boxes, Box, BarChart3, ArrowRightLeft } from "lucide-react";
import { WorkspaceView } from "../Components/WorkspaceView";
import { WsEditorPanel } from "../Components/WsEditorPanel";
import { MovingTab } from "../Components/VSPanel/MovingTab";
import { constants } from "@/shared";
import { shellConstants, type ModuleDefinition } from "@/shell";


const MovingTabAdapter = () => <MovingTab />;

const TAB_COLORS: Record<string, string> = {
    [shellConstants.vscode.tab.tabTypes.workspace]: "#a78bfa",
    [shellConstants.vscode.tab.tabTypes.trackingGraph]: "#22c55e",
};

export const workspaceModule: ModuleDefinition = {
    id: "Workspace",
    icon: Boxes,
    label: "Workspace",

    SidebarView: WorkspaceView,

    editorPanels: {
        [shellConstants.vscode.tab.tabTypes.workspace]: WsEditorPanel,
    },

    getTabMeta: (tab) => {
        const color = TAB_COLORS[tab.type] ?? "#9ca3af";
        const Icon = tab.type === shellConstants.vscode.tab.tabTypes.trackingGraph ? BarChart3 : Box;
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





