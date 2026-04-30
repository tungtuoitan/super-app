/**
 * Cross-feature helper: Task folder creation & note-to-folder assignment.
 * Owned by project feature because project/task controls the workspace folder lifecycle.
 * Consumed by useProjectSaveActions (task save) and useNoteSaveActions (note-from-task save).
 */

import { useRef, useEffect } from "react";
import { useAuthStore } from "@/shell";
import { useProjectStore } from "../store/useProject.store";
import type { Task } from "@/features/taskDetail";
import { useConsoleHelper } from "@/shared";
import { workspaceService } from "@/features/workspace";
import { taskService } from "@/features/taskDetail";
import { projectService, type ProjectDTO } from "../service/project.service";
import { WorkspaceItemAction } from "@/features/workspace";
import { parseApiError, isUnauthorizedError } from "@/shared";
import { parseAsLocalDate } from "@/shared";
import { debugLog } from "@/shell";
import { constants } from "@/shared";
import type { BaseTab } from "@/shell";
import type { Note } from "@/features/note";
import {useEditorTabBarStore} from "@/shell";
import {Project} from "../types/project.types";
import {usePTaskStore} from "@/features/project/store/usePTask.store";

export function useProjectTaskFolderHelper() {
    const _console = useConsoleHelper();
    const { $user } = useAuthStore();
    const { setOpenTabs } = useEditorTabBarStore();
    const { projects, setProjects } = useProjectStore();
    const { setTasks } = usePTaskStore();

    const projectsRef = useRef(projects);
    useEffect(() => { projectsRef.current = projects; }, [projects]);

    const { tasks } = usePTaskStore();
    const tasksRef = useRef(tasks);
    useEffect(() => { tasksRef.current = tasks; }, [tasks]);

    /** Resolve a project by ID, fetching from API if not in store */
    const resolveProject = async (projectId: number): Promise<Project | null> => {
        const token = $user.userToken ?? "";
        let project = projectsRef.current.find((p) => p.id === projectId);
        if (project) return project;

        const result = await projectService._getProjects(token, { ids: projectId.toString() });
        if (result.success && result.data && result.data.length > 0) {
            const fetched: Project[] = (result.data as ProjectDTO[]).map((dto) => ({
                id: dto.id,
                name: dto.name,
                description: dto.description,
                status: dto.status,
                startDate: parseAsLocalDate(dto.startDate),
                endDate: parseAsLocalDate(dto.endDate),
                createdAt: parseAsLocalDate(dto.createdAt) || new Date(),
                updatedAt: parseAsLocalDate(dto.updatedAt),
                deletedAt: parseAsLocalDate(dto.deletedAt),
                workspaceId: dto.workspaceId,
            }));
            setProjects((prev) => {
                const ids = new Set(prev.map((p) => p.id));
                return [...prev, ...fetched.filter((p) => !ids.has(p.id))];
            });
            project = fetched.find((p) => p.id === projectId);
        }
        return project ?? null;
    };

    /**
     * After a new task is saved:
     * 1. Ensure project has a workspace
     * 2. Create a folder named after the task in that workspace
     * 3. Update task.folderWorkspaceItemId in DB and local store
     */
    const createTaskFolder = async (savedTask: Task) => {
        debugLog.log("task-folder", "createTaskFolder-start", {
            taskId: savedTask.id,
            title: savedTask.title,
            projectId: savedTask.projectId,
            existingFolderWorkspaceItemId: savedTask.folderWorkspaceItemId,
        });
        try {
            const token = $user.userToken ?? "";

            const project = await resolveProject(savedTask.projectId);
            if (!project) {
                _console.error("Project not found — cannot create task folder");
                return;
            }

            const workspaceId = project.workspaceId;
            if (!workspaceId) {
                debugLog.log("task-folder", "createTaskFolder-skip-no-workspace", {
                    taskId: savedTask.id, projectId: savedTask.projectId,
                });
                return;
            }

            const folderName = savedTask.title || "Untitled";
            const createFolderRes = await workspaceService._upsertWorkspaceItems(token, workspaceId, [
                {
                    action: WorkspaceItemAction.Create,
                    entityType: 2,
                    parentId: null,
                    folderData: { name: folderName },
                },
            ]);

            if (!createFolderRes.success) {
                _console.error("Failed to create task folder in workspace");
                return;
            }

            const treeRes = await workspaceService._getWorkspaceTreeV2(token, workspaceId);
            if (!treeRes.success || !treeRes.object) {
                _console.error("Failed to load workspace tree after folder creation");
                return;
            }

            const newFolderWsItem = treeRes.object.flatData?.find(
                (item) => item.entityType === 2 && (item.data as any)?.name === folderName
            );

            if (!newFolderWsItem) {
                _console.error("Could not find newly created folder in workspace tree");
                return;
            }

            const folderWorkspaceItemId = newFolderWsItem.id;

            debugLog.log("task-folder", "createTaskFolder-folder-created", {
                taskId: savedTask.id,
                folderWorkspaceItemId,
                folderName: savedTask.title,
                workspaceId,
            });

            const updatedTaskResult = await taskService._upsertTaskBatch(token, [{
                id: savedTask.id,
                projectId: savedTask.projectId,
                parentTaskId: savedTask.parentTaskId,
                type: savedTask.type,
                title: savedTask.title,
                note: savedTask.note,
                status: savedTask.status,
                priority: savedTask.priority,
                startDate: savedTask.startDate ? savedTask.startDate.toISOString() : null,
                endDate: savedTask.endDate ? savedTask.endDate.toISOString() : null,
                orderIndex: savedTask.orderIndex,
                deletedAt: savedTask.deletedAt ? savedTask.deletedAt.toISOString() : null,
                folderWorkspaceItemId,
                checklistJson: savedTask.checklistJson,
                processJson: savedTask.processJson,
                customTabsJson: savedTask.customTabsJson,
            }]);

            if (updatedTaskResult.success && updatedTaskResult.data?.[0]) {
                debugLog.log("task-folder", "createTaskFolder-task-updated", {
                    taskId: savedTask.id,
                    folderWorkspaceItemId,
                    returnedFolderWorkspaceItemId: updatedTaskResult.data[0].folderWorkspaceItemId,
                });
                setTasks((prev) => prev.map((t) =>
                    t.id === savedTask.id ? { ...t, folderWorkspaceItemId } : t
                ));
                setOpenTabs((prev) => prev.map((tab) => {
                    if (tab.type === constants.vscode.tab.tabTypes.task && (tab.data as Task).id === savedTask.id) {
                        return { ...tab, data: { ...tab.data as Task, folderWorkspaceItemId }, data0: { ...tab.data0 as Task, folderWorkspaceItemId } };
                    }
                    return tab;
                }));
            }
        } catch (error) {
            console.error("Failed to create task folder:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to create task folder: ${errorMessage}`);
            }
        }
    };

    /**
     * After a task-created note is saved:
     * Add note to the task's workspace folder (folderWorkspaceItemId from tab metadata).
     */
    const addNoteToTaskFolder = async (savedNote: Note, activeTab: BaseTab) => {
        try {
            const token = $user.userToken ?? "";

            const folderWorkspaceItemId = activeTab.metadata?.folderWorkspaceItemId as number | null | undefined;
            if (!folderWorkspaceItemId) {
                _console.error("Task has no folder — folder should have been created when the task was saved");
                return;
            }

            const taskId = activeTab.metadata?.taskId as number;
            const task = tasksRef.current.find((t) => t.id === taskId)
                ?? (activeTab.metadata?.taskSnapshot as Task | undefined) ?? null;
            if (!task) {
                _console.error("Task not found");
                return;
            }

            const project = await resolveProject(task.projectId);
            if (!project?.workspaceId) {
                _console.error("Project workspace not found");
                return;
            }

            await workspaceService._upsertWorkspaceItems(token, project.workspaceId as number, [
                {
                    action: WorkspaceItemAction.Add,
                    entityType: 3,
                    entityId: savedNote.id,
                    parentId: folderWorkspaceItemId,
                },
            ]);

            _console.success("Note saved to task folder");
        } catch (error) {
            console.error("Failed to add note to task folder:", error);
            const errorMessage = await parseApiError(error);
            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to add note to task folder: ${errorMessage}`);
            }
        }
    };

    return { createTaskFolder, addNoteToTaskFolder };
}
