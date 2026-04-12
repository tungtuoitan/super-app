import { Cuboid } from "lucide-react";
import { ProjectView } from "@/Components/VSCodeLayout/ProjectView";
import { ProjectEditorPanel } from "@/Components/Project/ProjectEditorPanel";
import { MultiProjectEditorPanel } from "@/Components/MultiProject/MultiProjectEditorPanel";
import { TaskEditorPanel } from "@/Components/Task/TaskEditorPanel";
import { constants } from "@/utils/constants";
import type { ModuleDefinition } from "@/shell/moduleRegistry";

// These panels don't accept a `tab` prop — wrap with no-op adapter
const ProjectEditorPanelAdapter = () => <ProjectEditorPanel />;
const MultiProjectEditorPanelAdapter = () => <MultiProjectEditorPanel />;
const TaskEditorPanelAdapter = () => <TaskEditorPanel />;

export const projectModule: ModuleDefinition = {
    id: constants.modules.project,
    icon: Cuboid,
    label: constants.vscode.displayNames.project,

    SidebarView: ProjectView,

    editorPanels: {
        [constants.vscode.tab.tabTypes.project]: ProjectEditorPanelAdapter,
        [constants.vscode.tab.tabTypes.multiProject]: MultiProjectEditorPanelAdapter,
        [constants.vscode.tab.tabTypes.task]: TaskEditorPanelAdapter,
    },
};
