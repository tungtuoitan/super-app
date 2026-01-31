/**
 * Task Grid Helper Hook
 * Business logic for task grid operations
 */

import { taskService, TaskDTO } from "@/services/task.service";
import { Task, useTaskStore } from "@/store/task/useTask.store";
import { useProjectStore } from "@/store/project/useProject.store";
import { generateTempId } from "../../utils";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { useConsoleHelper } from "../console/useConsole.helper";

/**
 * Transform task DTOs (dates as strings) to domain models (dates as Date objects)
 */
const transformTaskData = (dtos: TaskDTO[]): Task[] => {
    return dtos.map((dto) => ({
        id: dto.id,
        projectId: dto.projectId,
        parentTaskId: dto.parentTaskId,
        type: dto.type,
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
    }));
};

export const useTaskGridHelper = () => {
    const { $user } = useAuthStore();
    const { tasks, setTasks, setTaskGridIsLoading, setTaskGridError, taskGridRowSelection, setTaskGridRowSelection, setTaskTotalCount } = useTaskStore();
    const { projects } = useProjectStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const _console = useConsoleHelper();

    /**
     * Create new task (temporary with negative ID)
     * Returns the created task
     */
    const createNewTask = (projectId: number): Task | null => {
        if (!projectId || projectId < 0) {
            _console.error("No valid project available to create task");
            return null;
        }

        // Generate sequential temporary negative ID
        const existingIds = tasks.map((t) => t.id);
        const tempId = generateTempId(existingIds);

        // Create temporary task
        const newTask: Task = {
            id: tempId,
            projectId: projectId,
            parentTaskId: null,
            type: "task",
            title: "",
            note: "",
            status: "open",
            priority: "medium",
            startDate: null,
            endDate: null,
            orderIndex: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
        };

        // Insert at the beginning of tasks array
        setTasks([newTask, ...tasks]);
        _console.success(`Created new task`);

        return newTask;
    };

    /**
     * Toggle delete/restore for selected tasks (soft delete)
     */
    const deleteRestoreTasks = async (ids?: number[], type: "soft-delete" | "restore" = "soft-delete", projectId?: number) => {
        const selectedIds = ids ?? Object.keys(taskGridRowSelection).map((id) => parseInt(id));
        if (selectedIds.length === 0) return;

        const tempTaskIds = selectedIds.filter((id) => id < 0);
        const persistedTaskIds = selectedIds.filter((id) => id > 0);

        try {
            const token = $user.userToken;

            // Handle temporary tasks - only for delete (remove from grid locally)
            if (type === "soft-delete" && tempTaskIds.length > 0) {
                setTasks((prev) => prev.filter((t) => !tempTaskIds.includes(t.id)));
                _console.success(`Removed ${tempTaskIds.length} unsaved task(s)`);
            }

            // Handle persisted tasks - call API
            if (persistedTaskIds.length > 0) {
                const deletedAt = type === "soft-delete" ? new Date().toISOString() : null;

                const batchRequests = persistedTaskIds.map((id) => {
                    const task = tasks.find((t) => t.id === id);
                    if (!task) {
                        throw new Error(`Task ${id} not found`);
                    }

                    return {
                        id: task.id,
                        projectId: task.projectId,
                        parentTaskId: task.parentTaskId,
                        type: task.type,
                        title: task.title,
                        note: task.note,
                        status: task.status,
                        priority: task.priority,
                        startDate: task.startDate?.toISOString() || null,
                        endDate: task.endDate?.toISOString() || null,
                        orderIndex: task.orderIndex,
                        deletedAt: deletedAt,
                    };
                });

                const result = await taskService._upsertTaskBatch(token, batchRequests);

                if (!result.success) {
                    throw new Error(result.message || `Failed to ${type === "soft-delete" ? "delete" : "restore"} tasks`);
                }

                _console.success(`Successfully ${type === "soft-delete" ? "soft deleted" : "restored"} ${persistedTaskIds.length} task(s)`);

                // Reload tasks from API
                if (projectId) {
                    await loadTasks(projectId);
                }
            }

            // Clear selection
            setTaskGridRowSelection({});
        } catch (error) {
            console.error(`Failed to ${type === "soft-delete" ? "delete" : "restore"} tasks:`, error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to ${type === "soft-delete" ? "delete" : "restore"} tasks: ${errorMessage}`);
            }
        }
    };

    /**
     * Handle context menu
     * @param event - Mouse event
     * @param row - Table row (optional)
     * @param projectId - Project ID for filtering
     * @param onTaskCreated - Callback when a new task is created
     */
    const openTaskContextMenu = (event: React.MouseEvent, row?: any, projectId?: number, onTaskCreated?: (task: Task) => void) => {
        event.preventDefault();
        event.stopPropagation();

        let selectedIds = Object.keys(taskGridRowSelection).map((id) => parseInt(id));

        // If no selection and row provided, use the hovered row
        if (selectedIds.length === 0 && row) {
            selectedIds = [parseInt(row.id)];
        }

        const selectedTasks = tasks.filter((t) => selectedIds.includes(t.id));

        showContextMenu(event, "task-grid", {
            selectedTasks,
            selectedIds,
            onSoftDelete: () => deleteRestoreTasks(selectedIds, "soft-delete", projectId),
            onRestore: () => deleteRestoreTasks(selectedIds, "restore", projectId),
            onAddTask: () => {
                if (projectId) {
                    const newTask = createNewTask(projectId);
                    if (newTask && onTaskCreated) {
                        onTaskCreated(newTask);
                    }
                }
            },
        });
    };

    /**
     * Load tasks for a specific project
     */
    const loadTasks = async (projectId?: number) => {
        try {
            setTaskGridIsLoading(true);
            const token = $user.userToken;

            const filterParams: { projectIds?: string; deletedAt?: string } = {
                deletedAt: "null", // Only active tasks by default
            };

            // Filter by project ID if provided
            if (projectId && projectId > 0) {
                filterParams.projectIds = String(projectId);
            }

            const result = await taskService._getTasks(token, filterParams);

            if (!result.success) {
                throw new Error(result.message || "Failed to load tasks");
            }

            const transformedData = transformTaskData(result.data || []);
            setTasks(transformedData);
            setTaskTotalCount(result.totalCount || transformedData.length);
            setTaskGridError(null);
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setTaskGridError(new Error(errorMessage));

            if (isUnauthorizedError(err)) {
                _console.error("Unauthorized. Please login again.");
            }
        } finally {
            setTimeout(() => {
                setTaskGridIsLoading(false);
            }, 100);
        }
    };

    /**
     * Save task (upsert)
     */
    const saveTask = async (task: Task, projectId?: number) => {
        try {
            const token = $user.userToken;

            const request = {
                id: task.id > 0 ? task.id : undefined,
                projectId: task.projectId,
                parentTaskId: task.parentTaskId,
                type: task.type,
                title: task.title,
                note: task.note,
                status: task.status,
                priority: task.priority,
                startDate: task.startDate?.toISOString() || null,
                endDate: task.endDate?.toISOString() || null,
                orderIndex: task.orderIndex,
                deletedAt: task.deletedAt?.toISOString() || null,
            };

            const result = await taskService._upsertTaskBatch(token, [request]);

            if (!result.success) {
                throw new Error(result.message || "Failed to save task");
            }

            _console.success("Task saved successfully");
            if (projectId) {
                await loadTasks(projectId);
            }
            return true;
        } catch (error) {
            const errorMessage = await parseApiError(error);
            _console.error(`Failed to save task: ${errorMessage}`);
            return false;
        }
    };

    return {
        openTaskContextMenu,
        loadTasks,
        createNewTask,
        deleteRestoreTasks,
        saveTask,
    };
};
