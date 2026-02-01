/**
 * Task Detail Content Component
 * Form for editing task details
 * Used within ProjectDetailContent TabBar when a task tab is active
 */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { GenericTextField, StatusAutoComplete, IStatusOption, RichTextEditor, DateTimePicker, GenericAutoComplete, IAutoCompleteOptions } from "@/shared/components";
import { CardContent } from "@/Components/ui/card";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { FileText } from "lucide-react";
import { Task } from "@/store/task/useTask.store";
import { useProjectStore } from "@/store/project/useProject.store";
import { useGeneralStore } from "@/store/general/General.store";
import { useEditorTabsStore, useAuthStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { BaseTab } from "@/types/editor/tab.types";
import { taskService, TaskDTO } from "@/services/task.service";

/**
 * Get task status colors from constants
 */
const getTaskStatusColors = (status: string) => {
    const colors = constants.optionColor.taskStatus.colors[status];
    return colors || constants.optionColor.taskStatus.default;
};

/**
 * Get task priority colors from constants
 */
const getTaskPriorityColors = (priority: string) => {
    const colors = constants.optionColor.taskPriority.colors[priority];
    return colors || constants.optionColor.taskPriority.default;
};

interface TaskDetailContentProps {
    taskTabId: string;
}

/**
 * TaskDetailContent
 * Form for editing task details
 */
export function TaskDetailContent({ taskTabId }: TaskDetailContentProps) {
    const { registriesByType } = useGeneralStore();
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { projects } = useProjectStore();
    const { $user } = useAuthStore();

    // Find the task tab by ID
    const taskTab = openTabs.find((tab) => tab.id === taskTabId && tab.type === constants.vscode.tab.tabTypes.task);
    const selectedTask = taskTab ? (taskTab.data as Task) : undefined;

    // State for parent task options (loaded separately)
    const [parentTaskOptions, setParentTaskOptions] = useState<IAutoCompleteOptions[]>([]);
    const [isLoadingParentTasks, setIsLoadingParentTasks] = useState(false);

    const [taskKey, setTaskKey] = React.useState(0);

    useEffect(() => {
        if (selectedTask) {
            setTaskKey((prev) => prev + 1);
        }
    }, [selectedTask?.id]);

    // Check if task is inactive (soft deleted)
    const isDeleted = selectedTask?.deletedAt !== null && selectedTask?.deletedAt !== undefined;

    // Get status options from registriesByType with colors
    const statusOptions: IStatusOption[] = useMemo(() => {
        const taskStatuses = registriesByType["task_status"] || [];
        return taskStatuses.map((reg) => {
            const colors = getTaskStatusColors(reg.code);
            return {
                id: reg.code,
                code: reg.code,
                label: reg.description || reg.code,
                bgColor: colors.bg,
                textColor: colors.text,
            };
        })
        .sort((a, b) => (constants.optionOrder.taskStatuses[a.label] ?? 999) - (constants.optionOrder.taskStatuses[b.label] ?? 999));
    }, [registriesByType]);

    // Get priority options from registriesByType with colors
    const priorityOptions: IStatusOption[] = useMemo(() => {
        const taskPriorities = registriesByType["task_priority"] || [];
        return taskPriorities.map((reg) => {
            const colors = getTaskPriorityColors(reg.code);
            return {
                id: reg.code,
                code: reg.code,
                label: reg.description || reg.code,
                bgColor: colors.bg,
                textColor: colors.text,
            };
        })
        .sort((a, b) => (constants.optionOrder.taskPriorities[a.label] ?? 999) - (constants.optionOrder.taskPriorities[b.label] ?? 999));
    }, [registriesByType]);

    // Create current status value for autocomplete
    const currentStatusValue: IStatusOption | null = statusOptions.find((option) => option.code === selectedTask?.status) || null;

    // Create current priority value for autocomplete
    const currentPriorityValue: IStatusOption | null = priorityOptions.find((option) => option.code === selectedTask?.priority) || null;

    // Get project options for autocomplete (disable completed/cancelled projects)
    const projectOptions: IAutoCompleteOptions[] = useMemo(() => {
        return projects
            .filter((p) => !p.deletedAt) // Only active projects
            .map((p) => ({
                id: p.id,
                label: p.name,
                desc: p.name,
                // Disable completed and cancelled projects
                isActive: p.status !== "completed" && p.status !== "cancelled",
            }));
    }, [projects]);

    // Get current project value for autocomplete
    const currentProjectValue: IAutoCompleteOptions | null = useMemo(() => {
        if (!selectedTask?.projectId) return null;
        const project = projects.find((p) => p.id === selectedTask.projectId);
        if (!project) return null;
        return {
            id: project.id,
            label: project.name,
            desc: project.name,
            isActive: project.status !== "completed" && project.status !== "cancelled",
        };
    }, [selectedTask?.projectId, projects]);

    // Load parent task options when project changes
    const loadParentTaskOptions = useCallback(async (projectId: number, currentTaskId: number) => {
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
                const options: IAutoCompleteOptions[] = result.data
                    .filter((t: TaskDTO) => t.id !== currentTaskId && t.id > 0)
                    .map((t: TaskDTO) => ({
                        id: t.id,
                        label: t.title || `Task #${t.id}`,
                        desc: t.title || `Task #${t.id}`,
                        isActive: true,
                    }));
                setParentTaskOptions(options);
            }
        } catch (error) {
            console.error("Failed to load parent task options:", error);
            setParentTaskOptions([]);
        } finally {
            setIsLoadingParentTasks(false);
        }
    }, [$user.userToken]);

    // Load parent task options when project changes or component mounts
    useEffect(() => {
        if (selectedTask?.projectId && selectedTask.projectId > 0) {
            loadParentTaskOptions(selectedTask.projectId, selectedTask.id);
        } else {
            setParentTaskOptions([]);
        }
    }, [selectedTask?.projectId, selectedTask?.id, loadParentTaskOptions]);

    // Get current parent task value for autocomplete
    const currentParentTaskValue: IAutoCompleteOptions | null = useMemo(() => {
        if (!selectedTask?.parentTaskId) return null;
        const parentTask = parentTaskOptions.find((t) => t.id === selectedTask.parentTaskId);
        if (parentTask) return parentTask;
        // If not found in options, create a placeholder
        return {
            id: selectedTask.parentTaskId,
            label: `Task #${selectedTask.parentTaskId}`,
            desc: `Task #${selectedTask.parentTaskId}`,
            isActive: true,
        };
    }, [selectedTask?.parentTaskId, parentTaskOptions]);

    // Handler for field changes - updates the tab data
    const handleFieldChange = (field: keyof Task, value: any) => {
        if (!taskTab || !selectedTask) return;

        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) =>
                t.id === taskTabId
                    ? {
                          ...t,
                          data: { ...selectedTask, [field]: value },
                          title: field === "title" && value ? value : t.title,
                          hasUnsavedChanges: true,
                      }
                    : t,
            ),
        );
    };

    const handleStatusChange = (event: React.SyntheticEvent, newValue: IStatusOption | null) => {
        if (newValue) {
            handleFieldChange("status", newValue.code);
        }
    };

    const handlePriorityChange = (event: React.SyntheticEvent, newValue: IStatusOption | null) => {
        if (newValue) {
            handleFieldChange("priority", newValue.code);
        }
    };

    const handleProjectChange = (event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        if (newValue) {
            const newProjectId = newValue.id as number;
            handleFieldChange("projectId", newProjectId);
            // Clear parent task when project changes
            handleFieldChange("parentTaskId", null);
            // Reload parent task options for new project
            if (selectedTask) {
                loadParentTaskOptions(newProjectId, selectedTask.id);
            }
        }
    };

    const handleParentTaskChange = (event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        handleFieldChange("parentTaskId", newValue ? (newValue.id as number) : null);
    };

    if (!selectedTask) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No task selected</p>
            </div>
        );
    }

    // Format date for display
    const formatDate = (date: Date | null | undefined): string => {
        if (!date) return "N/A";
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };

    return (
        <ScrollArea className="h-full w-full">
            <div className="px-6 py-4 mx-auto h-full">
                {/* Two-column layout: Details (2/3) | Metadata (1/3) */}
                <div className="flex">
                    {/* Left Column - Task Details (2/3 width) */}
                    <div className="flex-[3] min-w-0">
                        <CardContent className="space-y-4">
                            

                            {/* Task Title */}
                            <GenericTextField
                                label="Title"
                                value={selectedTask.title}
                                onChange={(e) => handleFieldChange("title", e.target.value)}
                                placeholder="Enter task title..."
                                size="small"
                                disabled={isDeleted}
                            />

                            {/* Date row */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <DateTimePicker
                                        label="Start Date"
                                        value={selectedTask.startDate}
                                        onChange={(date) => handleFieldChange("startDate", date)}
                                        placeholder="Pick start date..."
                                        disabled={isDeleted}
                                    />
                                </div>
                                <div className="flex-1">
                                    <DateTimePicker
                                        label="End Date"
                                        value={selectedTask.endDate}
                                        onChange={(date) => handleFieldChange("endDate", date)}
                                        placeholder="Pick end date..."
                                        disabled={isDeleted}
                                    />
                                </div>
                            </div>

                            {/* Note - Rich Text Editor */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Note
                                </label>
                                <div className="h-[580px] overflow-y-auto">
                                    <RichTextEditor
                                        key={`note-${taskKey}`}
                                        value={selectedTask.note || ""}
                                        onChange={(value) => handleFieldChange("note", value)}
                                        placeholder="Enter task notes..."
                                        minHeight="580px"
                                        className="text-left"
                                        disabled={isDeleted}
                                        uploadContext="project"
                                        uploadContextId={selectedTask.projectId}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </div>

                    {/* Right Column - Metadata (1/3 width) */}
                    <div className="flex-1 min-w-0">
                        <CardContent className="space-y-4">
                            {/* Status */}
                            <StatusAutoComplete
                                value={currentStatusValue}
                                onChange={handleStatusChange}
                                options={statusOptions}
                                inputProps={{
                                    name: "status",
                                    label: "Status",
                                }}
                                disabled={isDeleted}
                                placeholder="Select status..."
                            />

                            {/* Priority */}
                            <StatusAutoComplete
                                value={currentPriorityValue}
                                onChange={handlePriorityChange}
                                options={priorityOptions}
                                inputProps={{
                                    name: "priority",
                                    label: "Priority",
                                }}
                                disabled={isDeleted}
                                placeholder="Select priority..."
                            />

                            {/* Project Selection */}
                            <GenericAutoComplete
                                value={currentProjectValue}
                                onChange={handleProjectChange}
                                allOptions={projectOptions}
                                inputProps={{
                                    name: "project",
                                    label: "Project",
                                }}
                                disabled={isDeleted}
                                disableClearable
                            />

                            {/* Parent Task Selection */}
                            <GenericAutoComplete
                                value={currentParentTaskValue}
                                onChange={handleParentTaskChange}
                                allOptions={parentTaskOptions}
                                inputProps={{
                                    name: "parentTask",
                                    label: "Parent Task (Subtask of)",
                                }}
                                disabled={isDeleted || isLoadingParentTasks}
                            />

                            <GenericTextField label="Task ID" value={selectedTask.id > 0 ? selectedTask.id.toString() : "New (Unsaved)"} disabled size="small" />

                            <GenericTextField label="Created At" value={formatDate(selectedTask.createdAt)} disabled size="small" />

                            {selectedTask.updatedAt && <GenericTextField label="Updated At" value={formatDate(selectedTask.updatedAt)} disabled size="small" />}

                            {selectedTask.deletedAt && <GenericTextField label="Deleted At" value={formatDate(selectedTask.deletedAt)} disabled size="small" />}
                        </CardContent>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}
