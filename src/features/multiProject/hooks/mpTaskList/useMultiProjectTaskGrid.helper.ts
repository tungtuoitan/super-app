/**
 * Multi-Project Task Grid Helper Hook
 * Business logic for task grid operations across multiple projects
 */

import { taskService } from "@/features/taskDetail";
import type { TaskDTO, Task } from "@/features/taskDetail";
import { useMpTaskStore } from "@/features/multiProject/store/useMpTask.store";
import { generateTempId } from "@/utils/index";
import { useAuthStore } from "@/shell";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useOrchestratorContextMenuHelper } from "@/shared/menuContexts/helpers/useOrchestratorContextMenu.helper";
import { useConsoleHelper } from "@/shell";
import { parseAsLocalDate, toLocalISOString } from "@/utils/date.utils";
import { constants } from "@/utils/constants";

/**
 * Transform task DTOs to domain models
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
    }));
};

export const useMultiProjectTaskGridHelper = () => {
    const { $user } = useAuthStore();
    const { tasks, setTasks, setAllTasks, setTaskGridIsLoading, setTaskGridError, taskGridRowSelection, setTaskGridRowSelection, setTaskTotalCount } =
        useMpTaskStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const _console = useConsoleHelper();

    /**
     * Create new task for a specific project (temporary with negative ID)
     */
    const createNewTask = (projectId: number, parentTaskId?: number | null): Task | null => {
        if (!projectId || projectId < 0) {
            _console.error("No valid project available to create task");
            return null;
        }

        const existingIds = tasks.map((t) => t.id);
        const tempId = generateTempId(existingIds);

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
        };

        setTasks([newTask, ...tasks]);
        _console.success(parentTaskId ? `Created new subtask` : `Created new task`);

        return newTask;
    };

    /**
     * Toggle delete/restore for selected tasks (soft delete)
     */
    const deleteRestoreTasks = async (ids?: number[], type: "soft-delete" | "restore" = "soft-delete", projectIds?: number[]) => {
        const selectedIds = ids ?? Object.keys(taskGridRowSelection).map((id) => parseInt(id));
        if (selectedIds.length === 0) return;

        const tempTaskIds = selectedIds.filter((id) => id < 0);
        const persistedTaskIds = selectedIds.filter((id) => id > 0);

        try {
            const token = $user.userToken;

            if (type === "soft-delete" && tempTaskIds.length > 0) {
                setTasks((prev) => prev.filter((t) => !tempTaskIds.includes(t.id)));
                _console.success(`Removed ${tempTaskIds.length} unsaved task(s)`);
            }

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
                    };
                });

                const result = await taskService._upsertTaskBatch(token, batchRequests);

                if (!result.success) {
                    throw new Error(result.message || `Failed to ${type === "soft-delete" ? "delete" : "restore"} tasks`);
                }

                _console.success(`Successfully ${type === "soft-delete" ? "soft deleted" : "restored"} ${persistedTaskIds.length} task(s)`);

                if (projectIds && projectIds.length > 0) {
                    await loadTasksForProjects(projectIds);
                }
            }

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
     * Handle context menu for multi-project task grid
     */
    const openMultiProjectTaskContextMenu = (
        event: React.MouseEvent,
        row?: any,
        projectIds?: number[],
        onTaskCreated?: (task: Task) => void
    ) => {
        event.preventDefault();
        event.stopPropagation();

        let selectedIds = Object.keys(taskGridRowSelection).map((id) => parseInt(id));

        if (selectedIds.length === 0 && row) {
            selectedIds = [parseInt(row.id)];
        }

        const selectedTasks = tasks.filter((t) => selectedIds.includes(t.id));
        const hoveredTask = row ? tasks.find((t) => t.id === parseInt(row.id)) : null;

        // For multi-project view, we need to know which project to add task to
        // Use the first project in the list as default, or the hovered task's project
        const defaultProjectId = hoveredTask?.projectId || (projectIds && projectIds.length > 0 ? projectIds[0] : undefined);

        // Determine the parent task ID for subtask creation:
        // - If hovering a subtask, use its parent task ID
        // - If hovering a parent task, use that task's ID
        const getParentTaskIdForSubtask = (): number | null => {
            if (!hoveredTask) return null;
            if (hoveredTask.id <= 0) return null;

            // If hovering a subtask, create subtask for its parent
            if (hoveredTask.parentTaskId) {
                return hoveredTask.parentTaskId;
            }

            return hoveredTask.id;
        };

        // Check if task can be parent (for disabling menu option)
        const canBeParent = (taskId: number): boolean => {
            const task = tasks.find((t) => t.id === taskId);
            if (!task || task.id <= 0) return false;
            // A subtask cannot be a parent (depth=1)
            if (task.parentTaskId) return false;
            return true;
        };

        showContextMenu(event, "task-grid", {
            selectedTasks,
            selectedIds,
            hoveredTask,
            isMultiProjectView: true,
            projectIds,
            onSoftDelete: () => deleteRestoreTasks(selectedIds, "soft-delete", projectIds),
            onRestore: () => deleteRestoreTasks(selectedIds, "restore", projectIds),
            onAddTask: () => {
                if (defaultProjectId && defaultProjectId > 0) {
                    const newTask = createNewTask(defaultProjectId);
                    if (newTask && onTaskCreated) {
                        onTaskCreated(newTask);
                    }
                }
            },
            onAddSubTask: (parentTaskId: number) => {
                // Use the smart parent task ID calculation
                const actualParentId = parentTaskId || getParentTaskIdForSubtask();
                const parentTask = actualParentId ? tasks.find((t) => t.id === actualParentId) : null;

                if (parentTask && actualParentId && actualParentId > 0 && canBeParent(actualParentId)) {
                    const newSubTask = createNewTask(parentTask.projectId, actualParentId);
                    if (newSubTask && onTaskCreated) {
                        onTaskCreated(newSubTask);
                    }
                } else if (hoveredTask?.parentTaskId) {
                    // If clicking on a subtask, create subtask for the parent
                    const parentOfSubtask = tasks.find((t) => t.id === hoveredTask.parentTaskId);
                    if (parentOfSubtask) {
                        const newSubTask = createNewTask(parentOfSubtask.projectId, hoveredTask.parentTaskId);
                        if (newSubTask && onTaskCreated) {
                            onTaskCreated(newSubTask);
                        }
                    }
                }
            },
        });
    };

    /**
     * Load tasks for multiple projects
     */
    const loadTasksForProjects = async (projectIds: number[]) => {
        if (!projectIds || projectIds.length === 0) return;

        try {
            setTaskGridIsLoading(true);
            const token = $user.userToken;

            // Filter only valid (positive) project IDs
            const validProjectIds = projectIds.filter((id) => id > 0);
            if (validProjectIds.length === 0) {
                setTasks([]);
                setTaskTotalCount(0);
                return;
            }

            const taskGridFilters = $user.filters?.taskGrid || constants.filters.defaults.taskGrid;
            const filterParams = {
                projectIds: validProjectIds.join(","),
                deletedAt: "null",
                status: taskGridFilters.status,
                priority: taskGridFilters.priority,
            };

            // allTasksParams: same projectIds but WITHOUT status/priority filter
            const allTasksParams = {
                projectIds: validProjectIds.join(","),
                deletedAt: "null",
            };

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

    return {
        openMultiProjectTaskContextMenu,
        loadTasksForProjects,
        createNewTask,
        deleteRestoreTasks,
    };
};
