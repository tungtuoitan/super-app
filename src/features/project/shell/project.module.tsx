import { Cuboid, Layers, CheckSquare } from "lucide-react";
import { shellConstants } from "@/shell";
import { ProjectView } from "../Components/ProjectView";
import { ProjectEditorPanel } from "../Components/ProjectEditorPanel";
import type { ModuleDefinition, BaseTab } from "@/shell";
import type { TabStorage } from "@/shell";
import type { MultiProjectTabData } from "@/shell/types/tab.types";
import { constants } from "@/shared";
import { TaskEditorPanel } from "@/features/taskDetail";
import type { Task } from "@/features/taskDetail";
import { taskService, transformTaskData } from "@/features/taskDetail";
import type { TaskDTO } from "@/features/taskDetail";
// eslint-disable-next-line no-restricted-imports
import { MultiProjectEditorPanel } from "@/features/multiProject";
import type { KeywordPlugin } from "@/shell";
import { parseKeywordLink } from "@/shared";
import { projectService } from "../service/project.service";
import type { ProjectDTO } from "../service/project.service";
import type { Project } from "..";
import { useProjectSaveActions } from "../hooks/useProjectSaveActions";
import { useProjectStore } from "../store/useProject.store";

/** Transform a single ProjectDTO to domain model */
const _transformProject = (dto: ProjectDTO): Project => ({
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
});


const ProjectEditorPanelAdapter = () => <ProjectEditorPanel />;
const MultiProjectEditorPanelAdapter = () => <MultiProjectEditorPanel />;
const TaskEditorPanelAdapter = () => <TaskEditorPanel />;

const TAB_COLORS: Record<string, string> = {
    [shellConstants.vscode.tab.tabTypes.project]: "#f97316",
    [shellConstants.vscode.tab.tabTypes.multiProject]: "#f97316",
    [shellConstants.vscode.tab.tabTypes.task]: "#10b981",
};

export const projectModule: ModuleDefinition = {
    id: "Project",
    icon: Cuboid,
    label: "Projects",

    useSaveActions: useProjectSaveActions,

    tabPersistence: {
        getDataId: (tab) => {
            if (tab.type === shellConstants.vscode.tab.tabTypes.project) {
                const p = tab.data as Project;
                return p.id > 0 ? p.id : null;
            }
            if (tab.type === shellConstants.vscode.tab.tabTypes.task) {
                const t = tab.data as Task;
                return t.id > 0 ? t.id : null;
            }
            if (tab.type === shellConstants.vscode.tab.tabTypes.multiProject) {
                const mp = tab.data as MultiProjectTabData;
                return mp.projectIds.join(",");
            }
            return null;
        },
        restoreTab: async (persisted: TabStorage, userToken: string) => {
            if (persisted.type === shellConstants.vscode.tab.tabTypes.project) {
                const res = await projectService._getProjectById(userToken, persisted.dataId as number);
                if (!res.success || !res.data?.[0]) return null;
                const project = _transformProject(res.data[0]);
                return {
                    id: persisted.tabId,
                    type: shellConstants.vscode.tab.tabTypes.project,
                    data: project, data0: project,
                    title: project.name || shellConstants.vscode.tabTitles.unsavedProject,
                    hasUnsavedChanges: false,
                };
            }
            if (persisted.type === shellConstants.vscode.tab.tabTypes.task) {
                const res = await taskService._getTaskById(userToken, persisted.dataId as number);
                if (!res.success || !res.data?.[0]) return null;
                const [task] = transformTaskData(res.data as TaskDTO[]);
                return {
                    id: persisted.tabId,
                    type: shellConstants.vscode.tab.tabTypes.task,
                    data: task, data0: task,
                    title: task.title || shellConstants.vscode.tabTitles.unsavedTask,
                    hasUnsavedChanges: false,
                };
            }
            if (persisted.type === shellConstants.vscode.tab.tabTypes.multiProject) {
                const res = await projectService._getProjects(userToken, { ids: persisted.dataId as string });
                if (!res.success || !res.data?.length) return null;
                const projectIds = (persisted.dataId as string).split(",").map(Number).filter(n => n > 0);
                const projects = (res.data as ProjectDTO[]).map(_transformProject);
                const tabData: MultiProjectTabData = { projectIds, projects };
                return {
                    id: persisted.tabId,
                    type: shellConstants.vscode.tab.tabTypes.multiProject,
                    data: tabData, data0: tabData,
                    title: "Multiple-Projects",
                    hasUnsavedChanges: false,
                };
            }
            return null;
        },
    },

    SidebarView: ProjectView,

    editorPanels: {
        [shellConstants.vscode.tab.tabTypes.project]: ProjectEditorPanelAdapter,
        [shellConstants.vscode.tab.tabTypes.multiProject]: MultiProjectEditorPanelAdapter,
        [shellConstants.vscode.tab.tabTypes.task]: TaskEditorPanelAdapter,
    },

    getTabMeta: (tab) => {
        const color = TAB_COLORS[tab.type] ?? "#9ca3af";
        const Icon =
            tab.type === shellConstants.vscode.tab.tabTypes.task ? CheckSquare :
            tab.type === shellConstants.vscode.tab.tabTypes.multiProject ? Layers : Cuboid;
        return { icon: <Icon className="w-4 h-4" style={{ color }} />, color };
    },

    getTabGroupKey: (tab) => {
        if (tab.type !== shellConstants.vscode.tab.tabTypes.task) return null;
        const task = tab.data as Task;
        return `sa/p${task.projectId}/t${task.id}`;
    },

    getBackButton: (tab, { projects }) => {
        if (tab.type !== shellConstants.vscode.tab.tabTypes.task || tab.openedBy) return null;
        const task = tab.data as Task;
        const project = projects.find((p: any) => p.id === task.projectId);
        if (!project) return null;
        return { link: `sa/p${task.projectId}`, label: project.name };
    },

    useGetBackButton: () => {
        const { projects } = useProjectStore();
        return (tab: BaseTab) => {
            if (tab.type !== shellConstants.vscode.tab.tabTypes.task || tab.openedBy) return null;
            const task = tab.data as Task;
            const project = projects.find((p) => p.id === task.projectId);
            if (!project) return null;
            return { link: `sa/p${task.projectId}`, label: project.name };
        };
    },

    getBackButtonAsync: async (tab, userToken) => {
        if (tab.type !== shellConstants.vscode.tab.tabTypes.task || tab.openedBy) return null;
        const task = tab.data as Task;
        const res = await projectService._getProjectById(userToken, task.projectId);
        if (res.success && res.data?.[0]) {
            return { link: `sa/p${task.projectId}`, label: res.data[0].name };
        }
        return null;
    },

    filterViewKey: "projectGrid",
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
                    (t) => t.type === shellConstants.vscode.tab.tabTypes.project && (t.data as Project).id === parsed.projectId
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
                    ctx.openTab(project, shellConstants.vscode.tab.tabTypes.project, openedBy);
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
                    (t) => t.type === shellConstants.vscode.tab.tabTypes.task && (t.data as Task).id === parsed.taskId
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
                    ctx.openTab(task, shellConstants.vscode.tab.tabTypes.task, openedBy);
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





