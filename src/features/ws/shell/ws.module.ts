import { RulerDimensionLine } from "lucide-react";
import { WsView } from "@/Components/VSCodeLayout/WsView";
import { constants } from "@/utils/constants";
import type { ModuleDefinition } from "@/shell/moduleRegistry";

export const wsModule: ModuleDefinition = {
    id: constants.modules.ws,
    icon: RulerDimensionLine,
    label: constants.vscode.displayNames.ws,

    SidebarView: WsView, 

    editorPanels: {},
};
