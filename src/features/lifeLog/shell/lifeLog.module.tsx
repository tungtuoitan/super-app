import { Shell } from "lucide-react";
import { LifeLogView } from "@/Components/LifeLog/LifeLogView";
import { LogEditorPanel } from "@/Components/LifeLog/LogEditorPanel";
import { LifeLogGraphPanel } from "@/Components/LifeLog/LifeLogGraphPanel";
import { TrackEditorPanel } from "@/Components/LifeLog/TrackEditorPanel";
import { constants } from "@/utils/constants";
import type { ModuleDefinition } from "@/shell/moduleRegistry";

// These panels don't accept a `tab` prop — wrap with adapter
const LifeLogGraphPanelAdapter = () => <LifeLogGraphPanel />;

export const lifeLogModule: ModuleDefinition = {
    id: constants.modules.lifeLog,
    icon: Shell,
    label: constants.vscode.displayNames.lifeLog,

    SidebarView: LifeLogView,

    editorPanels: {
        [constants.vscode.tab.tabTypes.lifeLog]: LogEditorPanel,
        [constants.vscode.tab.tabTypes.lifeLogGraph]: LifeLogGraphPanelAdapter,
        [constants.vscode.tab.tabTypes.lifeLogTrack]: TrackEditorPanel,
    },
};
