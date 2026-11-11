import { NotebookPen } from "lucide-react";
import { shellConstants } from "@/shell";
import type { ModuleDefinition } from "@/shell";
import { ReflectJournal } from "../Components/ReflectJournal";
import { ReflectView } from "../Components/ReflectView";
import { reflectConstants } from "../reflect.constants";

export const reflectModule: ModuleDefinition = {
    id: reflectConstants.moduleId,
    icon: NotebookPen,
    label: reflectConstants.journalTitle,
    SidebarView: ReflectView,
    editorPanels: {
        [shellConstants.vscode.tab.tabTypes.reflect]: ReflectJournal,
    },
    getTabMeta: () => ({
        icon: <NotebookPen className="w-4 h-4" style={{ color: reflectConstants.color }} />,
        color: reflectConstants.color,
    }),
    filterViewKey: reflectConstants.filterViewKey,
};
