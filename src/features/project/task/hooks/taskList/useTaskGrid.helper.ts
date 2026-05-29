
/**
 * Task Grid Helper Hook
 * Business logic for task grid operations
 */

import { taskService } from "@/features/taskDetail";
import { projectConstants } from "@/features/project/project.constants";
import type { TaskDTO, Task } from "@/features/taskDetail";
import { useAuthStore } from "@/shared";
import { parseApiError, isUnauthorizedError } from "@/shared";
import { useMenuContextHelper } from "@/shared";
import { useConsoleHelper } from "@/shared";
import { parseAsLocalDate, toLocalISOString } from "@/shared";
import {usePTaskStore} from "@/features/project/store/usePTask.store";
import {generateTempId} from "@/features/workspace";
import type { TaskGridMenuData } from "@/shared";

/**
 * Transform task DTOs (dates as strings) to domain models (dates as Date objects)
 * Uses parseAsLocalDate to treat backend UTC as local time
 */
const transformTaskData = (dtos: TaskDTO[]): Task[] => {
    return dtos.map((dto) => ({
        id: dto.id,
        projectId: dto.projectId,
        parentTaskId: dto.parentTaskId,
        type: dto.type,
        taskType: dto.taskType || "personal",
        title: dto.title,
        note: dto.note,
        status: dto.status,
        priority: dto.priority,
        startDate: parseAsLocalDate(dto.startDate),
        endDate: parseAsLocalDate(dto.endDate),
        orderIndex: dto.orderIndex,
        createdAt: parseAsLocalDate(dto.createdAt) || new Date(),
        updatedAt: parseAsLocalDate(dto.updatedAt),
        deletedAt: parseAsLocalDate(dto.deletedAt),
        folderWorkspaceItemId: dto.folderWorkspaceItemId,
        checklistJson: dto.checklistJson ?? null,
        processJson: dto.processJson ?? null,
        customTabsJson: dto.customTabsJson ?? null,
        isMilestone: dto.isMilestone ?? false,
        // Limit dates for warning display
        projectStartDate: parseAsLocalDate(dto.projectStartDate),
        projectEndDate: parseAsLocalDate(dto.projectEndDate),
        parentStartDate: parseAsLocalDate(dto.parentStartDate),
        parentEndDate: parseAsLocalDate(dto.parentEndDate),
    }));
};

export const useTaskGridHelper = () => {
    const { $user } = useAuthStore();
    const { tasks, setTasks, setAllTasks, setTaskGridIsLoading, setTaskGridError, taskGridRowSelection, setTaskGridRowSelection, setTaskTotalCount } = usePTaskStore();

    const { showContextMenu } = useMenuContextHelper();
    const _console = useConsoleHelper();

    /**
     * Create new task (temporary with negative ID)
     * Returns the created task
     */
    const createNewTask = (projectId: number, parentTaskId?: number | null): Task | null => {
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
            parentTaskId: parentTaskId || null,
            type: "task",
            taskType: "personal",
            checklistJson: null,
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
            isMilestone: false,
        };

        // Insert at the beginning of tasks array
        setTasks([newTask, ...tasks]);
        _console.success(parentTaskId ? `Created new subtask` : `Created new task`);

        return newTask;
    };

    /**
     * Create new subtask (temporary with negative ID)
     * Returns the created subtask
     */
    const createSubTask = (projectId: number, parentTaskId: number): Task | null => {
        if (!parentTaskId || parentTaskId < 0) {
            _console.error("No valid parent task to create subtask");
            return null;
        }
        return createNewTask(projectId, parentTaskId);
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
                const deletedAt = type === "soft-delete" ? toLocalISOString(new Date()) : null;

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
                        startDate: toLocalISOString(task.startDate),
                        endDate: toLocalISOString(task.endDate),
                        orderIndex: task.orderIndex,
                        deletedAt: deletedAt,
                        folderWorkspaceItemId: task.folderWorkspaceItemId,
                        checklistJson: task.checklistJson,
                        processJson: task.processJson,
                        customTabsJson: task.customTabsJson,
                        isMilestone: task.isMilestone,
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
        } catch (err) {
            console.error(`Failed to ${type === "soft-delete" ? "delete" : "restore"} tasks:`, err);
            const errorMessage = await parseApiError(err);

            if (isUnauthorizedError(err)) {
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
     * @param onTaskCreated - Callback to notify caller of newly created task
     */
    const openTaskContextMenu = (
        event: React.MouseEvent,
        row?: { id: string },
        projectId?: number,
        onTaskCreated?: (task: Task) => void,
    ) => {
        event.preventDefault();
        event.stopPropagation();

        let selectedIds = Object.keys(taskGridRowSelection).map((id) => parseInt(id));

        if (selectedIds.length === 0 && row) {
            selectedIds = [parseInt(row.id)];
        }

        const selectedTasks = tasks.filter((t) => selectedIds.includes(t.id));
        const hoveredTask   = row ? (tasks.find((t) => t.id === parseInt(row.id)) ?? null) : null;

        const data: TaskGridMenuData = {
            selectedTasks: selectedTasks.map((t) => ({ id: t.id, deletedAt: t.deletedAt, isMilestone: t.isMilestone })),
            selectedIds,
            hoveredTask: hoveredTask
                ? { id: hoveredTask.id, deletedAt: hoveredTask.deletedAt, parentTaskId: hoveredTask.parentTaskId ?? null }
                : null,
            projectId,
            onTaskCreated,
            onToggleMilestone: (newValue: boolean) => toggleMilestoneTasks(selectedIds, newValue, projectId),
        };
        showContextMenu(event, "task-grid", data);
    };

    /**
     * Load tasks for a specific project
     */
    const loadTasks = async (projectId?: number) => {
        try {
            setTaskGridIsLoading(true);
            const token = $user.userToken;

            // Read task filters from userProfile (persisted), fall back to defaults
            const taskGridFilters = $user.filters?.taskGrid || projectConstants.filters.defaults.taskGrid;

            const filterParams: { projectIds?: string; deletedAt?: string; status?: string; priority?: string } = {
                deletedAt: "null", // Only active tasks by default
                status: taskGridFilters.status,
                priority: taskGridFilters.priority,
            };

            // Filter by project ID if provided
            if (projectId && projectId > 0) {
                filterParams.projectIds = String(projectId);
            }

            // allTasksParams: same as filterParams but WITHOUT status/priority filter
            const allTasksParams: { projectIds?: string; deletedAt?: string } = {
                deletedAt: "null",
            };
            if (projectId && projectId > 0) {
                allTasksParams.projectIds = String(projectId);
            }

            const [result, allResult] = await Promise.all([
                taskService._getTasks(token, filterParams),
                taskService._getTasks(token, allTasksParams),
            ]);

            if (!result.success) {
                throw new Error(result.message || "Failed to load tasks");
            }

            const transformedData = transformTaskData(result.data || []);
            setTasks(transformedData);
            setTaskTotalCount(result.totalCount || transformedData.length);
            setTaskGridError(null);

            // Store unfiltered tasks for TaskFlow view
            if (allResult.success) {
                setAllTasks(transformTaskData(allResult.data || []));
            } else {
                // Fallback: use filtered tasks
                setAllTasks(transformedData);
            }
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setTaskGridError(new Error(errorMessage));

            if (isUnauthorizedError(err)) {
                _console.error("Unauthorized. Please login again.");
            }
        } finally {
            setTaskGridIsLoading(false);
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
                startDate: toLocalISOString(task.startDate),
                endDate: toLocalISOString(task.endDate),
                orderIndex: task.orderIndex,
                deletedAt: toLocalISOString(task.deletedAt),
                folderWorkspaceItemId: task.folderWorkspaceItemId,
                checklistJson: task.checklistJson,
                processJson: task.processJson,
                customTabsJson: task.customTabsJson,
                isMilestone: task.isMilestone,
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

    /**
     * Toggle isMilestone for one or more persisted tasks. Optimistic; reverts on failure.
     */
    const toggleMilestoneTasks = async (ids: number[], newValue: boolean, projectId?: number) => {
        const persistedIds = ids.filter((id) => id > 0);
        if (persistedIds.length === 0) return;

        const previousTasks = tasks;
        setTasks((prev) =>
            prev.map((t) => (persistedIds.includes(t.id) ? { ...t, isMilestone: newValue } : t)),
        );

        try {
            const token = $user.userToken;
            const batchRequests = persistedIds.map((id) => {
                const task = previousTasks.find((t) => t.id === id);
                if (!task) throw new Error(`Task ${id} not found`);
                return {
                    id: task.id,
                    projectId: task.projectId,
                    parentTaskId: task.parentTaskId,
                    type: task.type,
                    title: task.title,
                    note: task.note,
                    status: task.status,
                    priority: task.priority,
                    startDate: toLocalISOString(task.startDate),
                    endDate: toLocalISOString(task.endDate),
                    orderIndex: task.orderIndex,
                    folderWorkspaceItemId: task.folderWorkspaceItemId,
                    checklistJson: task.checklistJson,
                    processJson: task.processJson,
                    customTabsJson: task.customTabsJson,
                    isMilestone: newValue,
                };
            });

            const result = await taskService._upsertTaskBatch(token, batchRequests);
            if (!result.success) {
                setTasks(() => previousTasks);
                _console.error(result.message || "Failed to toggle milestone");
                return;
            }
            _console.success(
                `${newValue ? "Marked" : "Unmarked"} ${persistedIds.length} task(s) as milestone`,
            );
            if (projectId) await loadTasks(projectId);
        } catch (err) {
            setTasks(() => previousTasks);
            const errorMessage = await parseApiError(err);
            _console.error(`Failed to toggle milestone: ${errorMessage}`);
        }
    };

    return {
        openTaskContextMenu,
        loadTasks,
        createNewTask,
        createSubTask,
        deleteRestoreTasks,
        toggleMilestoneTasks,
        saveTask,
    };
};



