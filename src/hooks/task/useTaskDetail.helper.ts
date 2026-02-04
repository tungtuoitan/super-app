/**
 * Task Detail Helper
 * Business logic for task detail operations
 */

import { useCallback } from "react";
import { Task } from "@/store/task/useTask.store";
import { taskService, TaskDTO } from "@/services/task.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "@/store/index";
import { useConsoleHelper } from "../console/useConsole.helper";
import { parseAsLocalDate, toLocalISOString } from "@/utils/date.utils";

/**
 * Transform task DTOs (dates as strings) to domain models (dates as Date objects)
 * Uses parseAsLocalDate to treat backend UTC as local time
 */
export const transformTaskData = (dtos: TaskDTO[]): Task[] => {
    return dtos.map((dto) => ({
        id: dto.id,
        projectId: dto.projectId,
        parentTaskId: dto.parentTaskId,
        type: dto.type,
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
        // Limit dates for warning display
        projectStartDate: parseAsLocalDate(dto.projectStartDate),
        projectEndDate: parseAsLocalDate(dto.projectEndDate),
        parentStartDate: parseAsLocalDate(dto.parentStartDate),
        parentEndDate: parseAsLocalDate(dto.parentEndDate),
    }));
};

export const useTaskDetailHelper = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { setOpenTabs, activeTabId, openTabs } = useEditorTabsStore();

    /**
     * Handle task field change - updates task data in tab
     */
    const handleTaskFieldChange = (field: keyof Task, value: any) => {
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t: BaseTab) => {
                if (t.id === activeTabId) {
                    const taskData = t.data as Task;
                    return {
                        ...t,
                        data: { ...taskData, [field]: value },
                        hasUnsavedChanges: true,
                    };
                }
                return t;
            }),
        );
    };

    /**
     * Save current task (create or update using Upsert pattern)
     * @param tabId - Current tab ID to update after save
     */
    const upsertTask = useCallback(
        async (tabId?: string): Promise<Task | null> => {
            // Get task data from active tab
            const activeTab = openTabs.find((tab) => tab.id === (tabId || activeTabId));
            const selectedTask = activeTab?.data as Task | undefined;

            if (!selectedTask) {
                console.warn("No selected task to upsert");
                return null;
            }

            // ============================================================
            // Step 1.5: Validate title field
            // ============================================================
            if (!selectedTask.title || selectedTask.title.trim() === "") {
                _console.error("Task title is required");
                return null;
            }

            // ============================================================
            // Step 2: Determine operation mode (create/update/restore)
            // ============================================================
            const isCreateMode = selectedTask.id <= 0;
            const originalTask = activeTab?.data0 as Task | undefined;
            const isRestoreMode = selectedTask.id > 0 && originalTask?.deletedAt && !selectedTask.deletedAt;
            const token = $user.userToken;

            try {
                // ============================================================
                // Step 3: Prepare upsert data - use toLocalISOString to preserve local time
                // ============================================================
                const upsertData = {
                    id: isCreateMode ? 0 : selectedTask.id, // Always use 0 for create
                    projectId: selectedTask.projectId,
                    parentTaskId: selectedTask.parentTaskId,
                    type: selectedTask.type || "task",
                    title: selectedTask.title,
                    note: selectedTask.note,
                    status: selectedTask.status || "open",
                    priority: selectedTask.priority || "low",
                    startDate: toLocalISOString(selectedTask.startDate),
                    endDate: toLocalISOString(selectedTask.endDate),
                    orderIndex: selectedTask.orderIndex || 0,
                    deletedAt: isRestoreMode ? null : toLocalISOString(selectedTask.deletedAt),
                };

                // ============================================================
                // Step 4: Call batch API to upsert task
                // ============================================================
                const result = await taskService._upsertTaskBatch(token, [upsertData]);
                if (!result.success) {
                    throw new Error(result.message || "Failed to save task");
                }

                // ============================================================
                // Step 6: Extract and validate saved task from response
                // ============================================================
                const savedTask = result && result.data && result.data.length > 0 ? result.data[0] : null;

                if (!savedTask) {
                    throw new Error("Failed to save task: No data returned from server");
                }

                // Transform DTO to domain model using parseAsLocalDate
                const transformedTask: Task = {
                    id: savedTask.id,
                    projectId: savedTask.projectId,
                    parentTaskId: savedTask.parentTaskId,
                    type: savedTask.type,
                    title: savedTask.title,
                    note: savedTask.note,
                    status: savedTask.status,
                    priority: savedTask.priority,
                    startDate: parseAsLocalDate(savedTask.startDate),
                    endDate: parseAsLocalDate(savedTask.endDate),
                    orderIndex: savedTask.orderIndex,
                    createdAt: parseAsLocalDate(savedTask.createdAt) || new Date(),
                    updatedAt: parseAsLocalDate(savedTask.updatedAt),
                    deletedAt: parseAsLocalDate(savedTask.deletedAt),
                };

                // ============================================================
                // Step 10: Update tab data and data0 with server response
                // ============================================================
                _console.success(isCreateMode ? "Task created successfully" : "Task saved successfully");
                if (tabId) {
                    setOpenTabs((prev) =>
                        prev.map((tab: BaseTab) => {
                            if (tab.id === tabId) {
                                return {
                                    ...tab,
                                    title: transformedTask.title || "Unsaved Task",
                                    data: transformedTask,
                                    data0: transformedTask, // Update data0 to new saved state
                                };
                            }
                            return tab;
                        }),
                    );
                }

                return transformedTask;
            } catch (error) {
                console.error("Failed to save task:", error);
                const errorMessage = await parseApiError(error);

                if (isUnauthorizedError(error)) {
                    _console.error("Unauthorized. Please login again.");
                } else {
                    _console.error(`Failed to save task: ${errorMessage}`);
                }
                return null;
            }
        },
        [openTabs, activeTabId, $user, _console, setOpenTabs],
    );

    return {
        upsertTask,
        handleTaskFieldChange,
    };
};
