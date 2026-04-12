import { Cuboid, Layers, CheckSquare } from "lucide-react";
import { ProjectView } from "../Components/ProjectView";
import { ProjectEditorPanel } from "@/Components/Project/ProjectEditorPanel";
import { MultiProjectEditorPanel } from "@/Components/MultiProject/MultiProjectEditorPanel";
import { TaskEditorPanel } from "@/Components/Task/TaskEditorPanel";
import { constants } from "@/utils/constants";
import type { Task } from "@/types/task/task.types";
import type { ModuleDefinition } from "@/shell/moduleRegistry";

const ProjectEditorPanelAdapter = () => <ProjectEditorPanel />;
const MultiProjectEditorPanelAdapter = () => <MultiProjectEditorPanel />;
const TaskEditorPanelAdapter = () => <TaskEditorPanel />;

const TAB_COLORS: Record<string, string> = {
    [constants.vscode.tab.tabTypes.project]: "#f97316",
    [constants.vscode.tab.tabTypes.multiProject]: "#f97316",
    [constants.vscode.tab.tabTypes.task]: "#10b981",
};

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

    getTabMeta: (tab) => {
        const color = TAB_COLORS[tab.type] ?? "#9ca3af";
        const Icon =
            tab.type === constants.vscode.tab.tabTypes.task ? CheckSquare :
            tab.type === constants.vscode.tab.tabTypes.multiProject ? Layers : Cuboid;
        return { icon: <Icon className="w-4 h-4" style={{ color }} />, color };
    },

    /** Task tab groups its child tabs (notes/files opened from within a task) */
    getTabGroupKey: (tab) => {
        if (tab.type !== constants.vscode.tab.tabTypes.task) return null;
        const task = tab.data as Task;
        return `sa/p${task.projectId}/t${task.id}`;
    },

    /** For task tabs without openedBy, derive back button pointing to their project */
    getBackButton: (tab, { projects }) => {
        if (tab.type !== constants.vscode.tab.tabTypes.task || tab.openedBy) return null;
        const task = tab.data as Task;
        const project = projects.find((p: any) => p.id === task.projectId);
        if (!project) return null;
        return { link: `sa/p${task.projectId}`, label: project.name };
    },
};
