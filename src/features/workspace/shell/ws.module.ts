import { RulerDimensionLine } from "lucide-react";
import { WsView } from "../Components/WsView";
import { constants } from "@/shared";
import type { ModuleDefinition } from "@/shell";

export const wsModule: ModuleDefinition = {
    id: constants.modules.ws,
    icon: RulerDimensionLine,
    label: constants.vscode.displayNames.ws,

    SidebarView: WsView, 

    editorPanels: {},
};
