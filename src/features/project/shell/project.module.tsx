import { Cuboid, Layers, CheckSquare } from "lucide-react";
import { ProjectView } from "../Components/ProjectView";
import { ProjectEditorPanel } from "../Components/ProjectEditorPanel";
import type { ModuleDefinition } from "@/shell";
import { constants, menuContextRegistry } from "@/shared";
import { ProjectGridMenu } from "../contexts/ProjectGridMenu";
import { TaskGridMenu } from "../task/contexts/menus/TaskGridMenu";
import { TaskFlowMenu } from "../task/contexts/menus/TaskFlowMenu";
import { TaskEditorPanel } from "@/features/taskDetail";
import type { Task } from "@/features/taskDetail";
// eslint-disable-next-line no-restricted-imports
import { MultiProjectEditorPanel } from "@/features/multiProject";
import type { KeywordPlugin } from "@/shell";
import { parseKeywordLink } from "@/shared";
import { projectService } from "../service/project.service";
import { taskService } from "@/features/taskDetail";
import type { Project } from "..";

menuContextRegistry.register({ handles: ["project-grid"], component: ProjectGridMenu });
menuContextRegistry.register({ handles: ["task-grid"],    component: TaskGridMenu });
menuContextRegistry.register({ handles: ["task-flow"],    component: TaskFlowMenu });

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

    getTabGroupKey: (tab) => {
        if (tab.type !== constants.vscode.tab.tabTypes.task) return null;
        const task = tab.data as Task;
        return `sa/p${task.projectId}/t${task.id}`;
    },

    getBackButton: (tab, { projects }) => {
        if (tab.type !== constants.vscode.tab.tabTypes.task || tab.openedBy) return null;
        const task = tab.data as Task;
        const project = projects.find((p: any) => p.id === task.projectId);
        if (!project) return null;
        return { link: `sa/p${task.projectId}`, label: project.name };
    },
};

// ─── Keyword Navigator Plugin ─────────────────────────────────────────────────

export const projectKeywordPlugin: KeywordPlugin = {
    handles: ["project", "task"],
    resolveTargetTypes: ["PROJECT", "TASK"],

    navigate: async (keyword, openedBy, ctx) => {
        const parsed = parseKeywordLink(keyword);
        if (!parsed) return false;

        if (parsed.type === "project" && parsed.projectId) {
            try {
                const existingTab = ctx.openTabs.find(
                    (t) => t.type === constants.vscode.tab.tabTypes.project && (t.data as Project).id === parsed.projectId
                );
                if (existingTab) {
                    if (openedBy) ctx.setOpenTabs((prev) => prev.map((t) => t.id === existingTab.id ? { ...t, openedBy } : t));
                    ctx.updateActiveTab(existingTab.id);
                    return true;
                }

                const res = await projectService._getProjectById(ctx.userToken, parsed.projectId);
                if (res.success && res.data?.[0]) {
                    const dto = res.data[0];
                    const project: Project = {
                        id: dto.id,
                        name: dto.name,
                        description: dto.description,
                        status: dto.status,
                        startDate: dto.startDate ? new Date(dto.startDate) : null,
                        endDate: dto.endDate ? new Date(dto.endDate) : null,
                        createdAt: new Date(dto.createdAt),
                        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
                        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
                        workspaceId: dto.workspaceId,
                    };
                    ctx.openTab(project, constants.vscode.tab.tabTypes.project, openedBy);
                } else {
                    ctx.log.error("Project not found");
                }
            } catch {
                ctx.log.error("Failed to load project");
            }
            return true;
        }

        if (parsed.type === "task" && parsed.taskId) {
            try {
                const existingTab = ctx.openTabs.find(
                    (t) => t.type === constants.vscode.tab.tabTypes.task && (t.data as Task).id === parsed.taskId
                );
                if (existingTab) {
                    if (openedBy) ctx.setOpenTabs((prev) => prev.map((t) => t.id === existingTab.id ? { ...t, openedBy } : t));
                    ctx.updateActiveTab(existingTab.id);
                    return true;
                }

                const res = await taskService._getTaskById(ctx.userToken, parsed.taskId);
                if (res.success && res.data?.[0]) {
                    const dto = res.data[0];
                    const task: Task = {
                        id: dto.id,
                        projectId: dto.projectId,
                        parentTaskId: dto.parentTaskId,
                        type: dto.type,
                        taskType: dto.taskType || "personal",
                        title: dto.title,
                        note: dto.note,
                        status: dto.status,
                        priority: dto.priority,
                        startDate: dto.startDate ? new Date(dto.startDate) : null,
                        endDate: dto.endDate ? new Date(dto.endDate) : null,
                        orderIndex: dto.orderIndex,
                        createdAt: new Date(dto.createdAt),
                        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
                        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
                        folderWorkspaceItemId: dto.folderWorkspaceItemId,
                        checklistJson: dto.checklistJson ?? null,
                        processJson: dto.processJson ?? null,
                        customTabsJson: dto.customTabsJson ?? null,
                    };
                    ctx.openTab(task, constants.vscode.tab.tabTypes.task, openedBy);
                } else {
                    ctx.log.error("Task not found");
                }
            } catch {
                ctx.log.error("Failed to load task");
            }
            return true;
        }

        return false;
    },

    resolveTarget: async (targetType, targetId, userToken) => {
        if (targetType === "PROJECT") {
            const res = await projectService._getProjectById(userToken, targetId);
            if (res.success && res.data?.[0]) return { link: `sa/p${targetId}`, label: res.data[0].name };
        }
        if (targetType === "TASK") {
            const res = await taskService._getTaskById(userToken, targetId);
            if (res.success && res.data?.[0]) {
                const dto = res.data[0];
                return { link: `sa/p${dto.projectId}/t${targetId}`, label: dto.title };
            }
        }
        return undefined;
    },
};
