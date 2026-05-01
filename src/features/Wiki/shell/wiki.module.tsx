import { BookOpen } from "lucide-react";
import { shellConstants } from "@/shell/shell.constants";
import { constants } from "@/shared";
import type { ModuleDefinition } from "@/shell";
import type { BaseTab } from "@/shell";
import WikiGraphView from "../Components/WikiGraphView/WikiGraphView";
import WikiInfoPanel from "../Components/WikiInfoPanel/WikiInfoPanel";

const WIKI_COLOR = "#8b5cf6";

const WikiInfoPanelAdapter = ({ tab }: { tab: BaseTab }) => (
    <WikiInfoPanel tab={tab} />
);

export const wikiModule: ModuleDefinition = {
    id: "Wiki",
    icon: BookOpen,
    label: "Wiki",

    SidebarView: WikiGraphView,

    editorPanels: {
        [shellConstants.vscode.tab.tabTypes.wikiInfo]: WikiInfoPanelAdapter,
    },

    keepAliveTabTypes: [shellConstants.vscode.tab.tabTypes.wikiInfo],

    getTabMeta: () => ({
        icon: <BookOpen className="w-4 h-4" style={{ color: WIKI_COLOR }} />,
        color: WIKI_COLOR,
    }),
};




