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

/**
 * Transform task DTOs (dates as strings) to domain models (dates as Date objects)
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
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        orderIndex: dto.orderIndex,
        createdAt: new Date(dto.createdAt),
        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
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
                // Step 3: Prepare upsert data
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
                    startDate: selectedTask.startDate ? selectedTask.startDate.toISOString() : null,
                    endDate: selectedTask.endDate ? selectedTask.endDate.toISOString() : null,
                    orderIndex: selectedTask.orderIndex || 0,
                    deletedAt: isRestoreMode ? null : selectedTask.deletedAt ? selectedTask.deletedAt.toISOString() : undefined,
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

                // Transform DTO to domain model
                const transformedTask: Task = {
                    id: savedTask.id,
                    projectId: savedTask.projectId,
                    parentTaskId: savedTask.parentTaskId,
                    type: savedTask.type,
                    title: savedTask.title,
                    note: savedTask.note,
                    status: savedTask.status,
                    priority: savedTask.priority,
                    startDate: savedTask.startDate ? new Date(savedTask.startDate) : null,
                    endDate: savedTask.endDate ? new Date(savedTask.endDate) : null,
                    orderIndex: savedTask.orderIndex,
                    createdAt: new Date(savedTask.createdAt),
                    updatedAt: savedTask.updatedAt ? new Date(savedTask.updatedAt) : null,
                    deletedAt: savedTask.deletedAt ? new Date(savedTask.deletedAt) : null,
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
