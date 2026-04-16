/**
 * Task Detail Form Helper
 * Functions only — field-change handlers and options loading.
 * State lives in useTaskStore. Derived values live in Selectors.
 */

import React, { useCallback } from "react";
import { Task, useTaskStore } from "../store/useTask.store";
import { TaskDTO, taskService } from "../service/task.service";
import { projectService } from "@/features/project/service/project.service";
import { useAuthStore } from "@/store/Auth.store";
import { useEditorTabsStore } from "@/store/index";
import { useGeneralStore } from "@/store/General.store";
import { BaseTab } from "@/types/editor/tab.types";
import { IAutoCompleteOptions, IStatusOption } from "@/shared/components";
import { getChecklistTemplate, isChecklistAllDone, parseChecklistJson, parseTextToChecklist } from "@/utils/checklist.utils";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";

export const useTaskDetailFormHelper = () => {
    const { $user } = useAuthStore();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();
    const { registriesByType } = useGeneralStore();
    const { setProjectOptions, setIsLoadingProjects, setParentTaskOptions, setIsLoadingParentTasks } = useTaskStore();

    const { taskTab, selectedTask } = useTaskDetailSelector();

    // ── Load functions ─────────────────────────────────────────────────────────

    const loadProjectOptions = useCallback(async () => {
        if (!$user.userToken) return;
        setIsLoadingProjects(true);
        try {
            const result = await projectService._getProjects($user.userToken, { deletedAt: "null" });
            if (result.success && result.data) {
                setProjectOptions(
                    result.data.map((p: any) => ({
                        id: p.id,
                        label: p.name,
                        desc: p.name,
                        isActive: p.status !== "completed" && p.status !== "cancelled",
                    })),
                );
            }
        } catch (error) {
            console.error("Failed to load project options:", error);
        } finally {
            setIsLoadingProjects(false);
        }
    }, [$user.userToken, setProjectOptions, setIsLoadingProjects]);

    const loadParentTaskOptions = useCallback(
        async (projectId: number, currentTaskId: number) => {
            if (!projectId || projectId < 0 || !$user.userToken) {
                setParentTaskOptions([]);
                return;
            }
            setIsLoadingParentTasks(true);
            try {
                const result = await taskService._getTasks($user.userToken, {
                    projectIds: String(projectId),
                    deletedAt: "null",
                });
                if (result.success && result.data) {
                    setParentTaskOptions(
                        result.data
                            .filter((t: TaskDTO) => t.id !== currentTaskId && t.id > 0 && !t.parentTaskId)
                            .map((t: TaskDTO) => ({
                                id: t.id,
                                label: t.title || `Task #${t.id}`,
                                desc: t.title || `Task #${t.id}`,
                                isActive: true,
                            })),
                    );
                }
            } catch (error) {
                console.error("Failed to load parent task options:", error);
                setParentTaskOptions([]);
            } finally {
                setIsLoadingParentTasks(false);
            }
        },
        [$user.userToken, setParentTaskOptions, setIsLoadingParentTasks],
    );

    // ── Field change handlers ─────────────────────────────────────────────────

    const handleFieldChange = useCallback(
        (field: keyof Task, value: any) => {
            if (!taskTab || !selectedTask) return;
            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t) =>
                    t.id === activeTabId
                        ? {
                              ...t,
                              data: { ...selectedTask, [field]: value },
                              title: field === "title" && value ? value : t.title,
                              hasUnsavedChanges: true,
                          }
                        : t,
                ),
            );
        },
        [taskTab, selectedTask, activeTabId, setOpenTabs],
    );

    const handleStatusChange = useCallback(
        (_e: React.SyntheticEvent, newValue: IStatusOption | null) => {
            if (!newValue) return;
            if (newValue.code === "completed" && selectedTask?.checklistJson) {
                const checklist = parseChecklistJson(selectedTask.checklistJson);
                if (checklist && !isChecklistAllDone(checklist)) {
                    alert("Complete all checklist items before closing this task.");
                    return;
                }
            }
            handleFieldChange("status", newValue.code);
        },
        [selectedTask, handleFieldChange],
    );

    const handlePriorityChange = useCallback(
        (_e: React.SyntheticEvent, newValue: IStatusOption | null) => {
            if (newValue) handleFieldChange("priority", newValue.code);
        },
        [handleFieldChange],
    );

    const handleTaskTypeChange = useCallback(
        (_e: React.SyntheticEvent, newValue: IStatusOption | null) => {
            if (!newValue || !taskTab || !selectedTask) return;
            const newType = newValue.code;
            let newChecklistJson = selectedTask.checklistJson ?? null;
            if (!newChecklistJson) {
                const template = getChecklistTemplate(newType, registriesByType);
                if (template) newChecklistJson = JSON.stringify(parseTextToChecklist(template));
            }
            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t) =>
                    t.id === activeTabId
                        ? {
                              ...t,
                              data: { ...selectedTask, taskType: newType, checklistJson: newChecklistJson },
                              hasUnsavedChanges: true,
                          }
                        : t,
                ),
            );
        },
        [taskTab, selectedTask, activeTabId, registriesByType, setOpenTabs],
    );

    const handleProjectChange = useCallback(
        (_e: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
            if (!newValue || !taskTab || !selectedTask) return;
            const newProjectId = newValue.id as number;
            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t) =>
                    t.id === activeTabId
                        ? {
                              ...t,
                              data: { ...selectedTask, projectId: newProjectId, parentTaskId: null },
                              hasUnsavedChanges: true,
                          }
                        : t,
                ),
            );
            loadParentTaskOptions(newProjectId, selectedTask.id);
        },
        [taskTab, selectedTask, activeTabId, setOpenTabs, loadParentTaskOptions],
    );

    const handleParentTaskChange = useCallback(
        (_e: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
            handleFieldChange("parentTaskId", newValue ? (newValue.id as number) : null);
        },
        [handleFieldChange],
    );

    return {
        // load functions
        loadProjectOptions,
        loadParentTaskOptions,
        // handlers
        handleFieldChange,
        handleStatusChange,
        handlePriorityChange,
        handleTaskTypeChange,
        handleProjectChange,
        handleParentTaskChange,
    };
};
