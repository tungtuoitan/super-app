import { Boxes, ArrowRightLeft } from "lucide-react";
import { WorkspaceView } from "@/Components/VSCodeLayout/WorkspaceView";
import { WsEditorPanel } from "@/Components/Workspace/WsEditorPanel";
import { TrackingGraphPanel } from "@/Components/TrackingGraph/TrackingGraphPanel";
import { MovingTab } from "@/Components/VSPanel/MovingTab";
import { constants } from "@/utils/constants";
import type { ModuleDefinition } from "@/shell/moduleRegistry";

const MovingTabAdapter = () => <MovingTab />;

export const workspaceModule: ModuleDefinition = {
    id: constants.modules.workspace,
    icon: Boxes,
    label: constants.vscode.displayNames.workspace,

    SidebarView: WorkspaceView,

    editorPanels: {
        [constants.vscode.tab.tabTypes.workspace]: WsEditorPanel,
        [constants.vscode.tab.tabTypes.trackingGraph]: TrackingGraphPanel,
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
