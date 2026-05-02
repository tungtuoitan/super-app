import { RulerDimensionLine } from "lucide-react";
import { WsView } from "../Components/WsView";
import { constants } from "@/shared";
import { shellConstants, type ModuleDefinition } from "@/shell";

export const wsModule: ModuleDefinition = {
    id: "Ws",
    icon: RulerDimensionLine,
    label: "All Workspaces",
    hideFromActivityBar: true,

    SidebarView: WsView,

    editorPanels: {},

    filterViewKey: "wsGrid",
};




