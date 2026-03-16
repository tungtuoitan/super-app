/**
 * Task Detail Content Component
 * Form for editing task details
 * Used within ProjectDetailContent TabBar when a task tab is active
 */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { GenericTextField, StatusAutoComplete, IStatusOption, RichTextEditor, DateRangePicker, GenericAutoComplete, IAutoCompleteOptions } from "@/shared/components";
import { CardContent } from "@/Components/ui/card";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { FileText, AlertCircle, Link2, X, Loader2, Plus, FilePlus, FileIcon } from "lucide-react";
import { Task, useTaskStore } from "@/store/task/useTask.store";
import { useProjectStore } from "@/store/project/useProject.store";
import { useGeneralStore } from "@/store/general/General.store";
import { useEditorTabsStore, useAuthStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { BaseTab } from "@/types/editor/tab.types";
import { taskService, TaskDTO } from "@/services/task.service";
import { projectService } from "@/services/project.service";
import { standardRegistryService } from "@/services/standardRegistry.service";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { useTaskLinkedKeywordsHelper } from "@/hooks/task/useTaskLinkedKeywords.helper";
import { useTaskWorkspaceItemHelper } from "@/hooks/task/useTaskWorkspaceItem.helper";
import { useCommandPaletteHelper } from "@/hooks/index";
import { useKeywordNavigationHelper } from "@/hooks/keyword/useKeywordNavigation.helper";
import { KeywordIconRenderer } from "@/Components/shared/KeywordIconRenderer";
import { parseAsLocalDate, toLocalISOString } from "@/utils/date.utils";
import { useConfirmationPopoverHelper } from "@/hooks/useConfirmationPopover.helper";
import { TaskChecklist } from "./TaskChecklist";
import {
    ChecklistJSON,
    parseChecklistJson,
    isChecklistAllDone,
    getChecklistTemplate,
    parseTextToChecklist,
} from "@/utils/checklist.utils";

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
    const { registriesByType, allKeywords } = useGeneralStore();
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { projects } = useProjectStore();
    const { $user } = useAuthStore();
    const { tasks, setTasks } = useTaskStore();

    // Task type options from registry
    const taskTypeOptions: IStatusOption[] = useMemo(() => {
        const taskTypes = registriesByType["taskType"] || [];
        return taskTypes.map((reg) => ({
            id: reg.code,
            code: reg.code,
            label: reg.description || reg.code,
            bgColor: "",
            textColor: "",
        }));
    }, [registriesByType]);

    // Find the task tab by ID
    const taskTab = openTabs.find((tab) => tab.id === taskTabId && tab.type === constants.vscode.tab.tabTypes.task);
    const selectedTask = taskTab ? (taskTab.data as Task) : undefined;

    const currentTaskTypeValue: IStatusOption | null =
        taskTypeOptions.find((o) => o.code === selectedTask?.taskType) ?? null;

    // State for parent task options (loaded separately)
    const [parentTaskOptions, setParentTaskOptions] = useState<IAutoCompleteOptions[]>([]);
    const [isLoadingParentTasks, setIsLoadingParentTasks] = useState(false);

    const [taskKey, setTaskKey] = React.useState(0);

    useEffect(() => {
        if (selectedTask) {
            setTaskKey((prev) => prev + 1);
        }
    }, [selectedTask?.id]);

    // Check if task is inactive (soft deleted, completed, cancelled, or on hold)
    const isDeleted = selectedTask?.deletedAt !== null && selectedTask?.deletedAt !== undefined;
    const isCompleted = selectedTask?.status === "completed" || selectedTask?.status === "cancelled" || selectedTask?.status === "on_hold";

    // Get current project
    const currentProject = useMemo(() => {
        if (!selectedTask?.projectId) return null;
        return projects.find((p) => p.id === selectedTask.projectId) || null;
    }, [selectedTask?.projectId, projects]);

    // Check if project is completed or cancelled (all fields should be disabled)
    const isProjectInactive = currentProject?.status === "completed" || currentProject?.status === "cancelled";

    // Combined disabled state
    const isDisabled = isDeleted || isCompleted || isProjectInactive;

    // Get parent task (if this is a subtask)
    const parentTask = useMemo(() => {
        if (!selectedTask?.parentTaskId) return null;
        return tasks.find((t) => t.id === selectedTask.parentTaskId) || null;
    }, [selectedTask?.parentTaskId, tasks]);

    // Calculate limit dates for visual reference (optional - does not block selection)
    const limitDates = useMemo(() => {
        // For subtasks: limit is parent task dates
        if (selectedTask?.parentTaskId) {
            return {
                limitStartDate: selectedTask.parentStartDate || null,
                limitEndDate: selectedTask.parentEndDate || null,
            };
        }
        // For regular tasks: limit is project dates
        return {
            limitStartDate: selectedTask?.projectStartDate || null,
            limitEndDate: selectedTask?.projectEndDate || null,
        };
    }, [selectedTask?.parentTaskId, selectedTask?.parentStartDate, selectedTask?.parentEndDate, selectedTask?.projectStartDate, selectedTask?.projectEndDate]);

    // Check if this task has subtasks (used to filter parent task options)
    const hasSubtasks = useMemo(() => {
        if (!selectedTask) return false;
        return tasks.some((t) => t.parentTaskId === selectedTask.id);
    }, [selectedTask, tasks]);

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

    // Project options - loaded via API (projects store may be incomplete)
    const [projectOptions, setProjectOptions] = useState<IAutoCompleteOptions[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);

    const loadProjectOptions = useCallback(async () => {
        if (!$user.userToken) return;
        setIsLoadingProjects(true);
        try {
            const result = await projectService._getProjects($user.userToken, { deletedAt: "null" });
            if (result.success && result.data) {
                const options: IAutoCompleteOptions[] = result.data.map((p: any) => ({
                    id: p.id,
                    label: p.name,
                    desc: p.name,
                    isActive: p.status !== "completed" && p.status !== "cancelled",
                }));
                setProjectOptions(options);
            }
        } catch (error) {
            console.error("Failed to load project options:", error);
        } finally {
            setIsLoadingProjects(false);
        }
    }, [$user.userToken]);

    useEffect(() => {
        loadProjectOptions();
    }, [loadProjectOptions]);

    // Get current project value for autocomplete
    const currentProjectValue: IAutoCompleteOptions | null = useMemo(() => {
        if (!selectedTask?.projectId) return null;
        return projectOptions.find((p) => p.id === selectedTask.projectId) ?? {
            id: selectedTask.projectId,
            label: `Project #${selectedTask.projectId}`,
            desc: `Project #${selectedTask.projectId}`,
            isActive: true,
        };
    }, [selectedTask?.projectId, projectOptions]);

    // Load parent task options when project changes
    // Filter out: current task, subtasks (depth=1), and tasks that already have subtasks
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
                // Get list of task IDs that have subtasks
                const taskIdsWithSubtasks = new Set<number>();
                result.data.forEach((t: TaskDTO) => {
                    if (t.parentTaskId) {
                        taskIdsWithSubtasks.add(t.parentTaskId);
                    }
                });

                const options: IAutoCompleteOptions[] = result.data
                    .filter((t: TaskDTO) => {
                        // Exclude current task
                        if (t.id === currentTaskId) return false;
                        // Only include saved tasks (id > 0)
                        if (t.id <= 0) return false;
                        // Exclude tasks that are already subtasks (cannot be a parent - depth=1)
                        if (t.parentTaskId) return false;
                        // If current task has subtasks, it cannot become a subtask of another task
                        // (This is handled elsewhere, but included for clarity)
                        return true;
                    })
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

    // Linked Keywords
    const { linkedKeywords, isLoadingLinkedKeywords, loadLinkedKeywords, linkKeyword, unlinkKeyword } = useTaskLinkedKeywordsHelper();
    const { openForLink } = useCommandPaletteHelper();
    const { folderItems, isLoadingFolderItems, loadFolderItems, openFolderItem, createTaskNote } = useTaskWorkspaceItemHelper();
    const { navigateLink } = useKeywordNavigationHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();

    // Load linked keywords when task changes
    useEffect(() => {
        if (selectedTask?.id && selectedTask.id > 0) {
            loadLinkedKeywords(selectedTask.id);
        }
    }, [selectedTask?.id, loadLinkedKeywords]);

    // Load folder items (notes/files in task's workspace folder) when task or project workspace changes
    useEffect(() => {
        if (selectedTask?.id && selectedTask.id > 0 && selectedTask.folderWorkspaceItemId && currentProject?.workspaceId) {
            loadFolderItems(selectedTask, currentProject.workspaceId);
        }
    }, [selectedTask?.id, selectedTask?.folderWorkspaceItemId, currentProject?.workspaceId, loadFolderItems]);

    // Open CommandPalette in link mode
    const handleOpenLinkPalette = useCallback(() => {
        if (!selectedTask) return;
        const linkedIds = new Set(linkedKeywords.map((lk) => lk.keywordId));
        // Also disable keywords matching inner list items (by workspaceItemId)
        const folderWsItemIds = new Set(folderItems.map((fi) => fi.workspaceItemId));
        allKeywords.forEach((kw) => {
            if (kw.workspaceItemId !== undefined && folderWsItemIds.has(kw.workspaceItemId)) {
                linkedIds.add(kw.id);
            }
        });
        openForLink((keyword) => {
            linkKeyword(selectedTask.id, keyword.id);
        }, linkedIds);
    }, [selectedTask, openForLink, linkKeyword, linkedKeywords, folderItems, allKeywords]);

    // Navigate to linked keyword — pass current task as openedBy so back button works
    const handleNavigateKeyword = useCallback((keyword: { link: string; longLink: string; name: string; type: any; id: number; hardDeletedAt: null }) => {
        navigateLink(keyword as any, { link: `sa/p${selectedTask?.projectId}/t${selectedTask?.id}`, label: selectedTask?.title ?? "" });
    }, [navigateLink, selectedTask]);

    // Unlink keyword with confirmation popup
    const handleUnlinkKeyword = useCallback((event: React.MouseEvent, linkId: number, name: string) => {
        if (!selectedTask) return;
        showConfirmation({
            title: name,
            subtitle: "This will remove the link between this keyword and the task.",
            confirmText: "Unlink",
            cancelText: "Cancel",
            confirmColor: "destructive",
            cancelColor: "outline",
            anchorEl: event.currentTarget as HTMLElement,
            onConfirm: async () => {
                await unlinkKeyword(selectedTask.id, linkId);
            },
        });
    }, [selectedTask, unlinkKeyword, showConfirmation]);

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
        if (!newValue) return;
        // Block setting "completed" if checklist exists but isn't fully done
        if (newValue.code === "completed" && selectedTask?.checklistJson) {
            const checklist = parseChecklistJson(selectedTask.checklistJson);
            if (checklist && !isChecklistAllDone(checklist)) {
                alert("Complete all checklist items before closing this task.");
                return;
            }
        }
        handleFieldChange("status", newValue.code);
    };

    const handlePriorityChange = (event: React.SyntheticEvent, newValue: IStatusOption | null) => {
        if (newValue) {
            handleFieldChange("priority", newValue.code);
        }
    };

    const handleTaskTypeChange = (event: React.SyntheticEvent, newValue: IStatusOption | null) => {
        if (!newValue || !taskTab || !selectedTask) return;
        const newType = newValue.code;
        // Auto-populate checklist from template when task type is set and no checklist exists yet
        let newChecklistJson = selectedTask.checklistJson ?? null;
        if (!newChecklistJson) {
            const template = getChecklistTemplate(newType, registriesByType);
            if (template) {
                const json = parseTextToChecklist(template);
                newChecklistJson = JSON.stringify(json);
            }
        }
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) =>
                t.id === taskTabId
                    ? { ...t, data: { ...selectedTask, taskType: newType, checklistJson: newChecklistJson }, hasUnsavedChanges: true }
                    : t
            )
        );
    };

    const handleProjectChange = (event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        if (newValue && taskTab && selectedTask) {
            const newProjectId = newValue.id as number;
            // Update both projectId and parentTaskId in a single setOpenTabs call
            // to avoid the second call overwriting the first (closure stale data issue)
            setOpenTabs((prev: BaseTab[]) =>
                prev.map((t) =>
                    t.id === taskTabId
                        ? {
                              ...t,
                              data: { ...selectedTask, projectId: newProjectId, parentTaskId: null },
                              hasUnsavedChanges: true,
                          }
                        : t,
                ),
            );
            loadParentTaskOptions(newProjectId, selectedTask.id);
        }
    };

    const handleParentTaskChange = (event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
        handleFieldChange("parentTaskId", newValue ? (newValue.id as number) : null);
    };

    // ── Checklist helpers ─────────────────────────────────────────────────────

    /** Persist checklistJson (and optionally auto-complete status) to server immediately */
    const saveChecklistToServer = useCallback(async (json: ChecklistJSON, task: Task) => {
        if (task.id <= 0 || !$user.userToken) return;
        const allDone = isChecklistAllDone(json);
        const newStatus = allDone ? "completed" : task.status;
        const newChecklistJson = JSON.stringify(json);

        await taskService._upsertTaskBatch($user.userToken, [{
            id: task.id,
            projectId: task.projectId,
            parentTaskId: task.parentTaskId,
            type: task.type,
            taskType: task.taskType,
            title: task.title,
            note: task.note,
            status: newStatus,
            priority: task.priority,
            startDate: toLocalISOString(task.startDate),
            endDate: toLocalISOString(task.endDate),
            orderIndex: task.orderIndex,
            deletedAt: null,
            checklistJson: newChecklistJson,
        }]);

        // Update tab to reflect server save (clear unsaved flag + status if auto-completed)
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) =>
                t.id === taskTabId
                    ? {
                          ...t,
                          data: { ...(t.data as Task), checklistJson: newChecklistJson, status: newStatus },
                          data0: { ...(t.data as Task), checklistJson: newChecklistJson, status: newStatus },
                          hasUnsavedChanges: false,
                      }
                    : t
            )
        );

        // Also update tasks store so grid reflects new status
        if (allDone) {
            setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, checklistJson: newChecklistJson, status: newStatus } : t));
        }
    }, [$user.userToken, taskTabId, setOpenTabs, setTasks]);

    /** Item toggled in view mode → update local state + save immediately (skipped for new tasks) */
    const handleChecklistChange = useCallback((updated: ChecklistJSON) => {
        if (!selectedTask) return;
        const newJson = JSON.stringify(updated);
        const isNewTask = selectedTask.id <= 0;
        // Optimistic local update
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) =>
                t.id === taskTabId
                    ? { ...t, data: { ...(t.data as Task), checklistJson: newJson }, hasUnsavedChanges: isNewTask }
                    : t
            )
        );
        // Persist immediately for saved tasks (no-op for new tasks — saved with the task)
        if (!isNewTask) {
            saveChecklistToServer(updated, { ...selectedTask, checklistJson: newJson });
        }
    }, [selectedTask, taskTabId, setOpenTabs, saveChecklistToServer]);

    /** Checklist saved from edit mode */
    const handleChecklistSave = useCallback((json: ChecklistJSON) => {
        if (!selectedTask) return;
        handleChecklistChange(json);
    }, [selectedTask, handleChecklistChange]);

    /** Set as default for task type — saves template text to registry */
    const handleSetAsDefault = useCallback(async (templateText: string) => {
        if (!selectedTask?.taskType || !$user.userToken) return;
        await standardRegistryService._setChecklistTemplate($user.userToken, selectedTask.taskType, templateText);
    }, [selectedTask?.taskType, $user.userToken]);

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
        <ScrollArea className="h-full w-full ">
            <div className="px-6 py-4 mx-auto h-full ">
                {/* Project inactive alert */}
                {isProjectInactive && (
                    <Alert variant="default" className="mb-4 border-yellow-500/50 bg-yellow-500/10">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <AlertDescription className="text-yellow-500">
                            This task belongs to a {currentProject?.status} project. Editing is disabled.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Two-column layout: Details (2/3) | Metadata (1/3) */}
                <div className="flex">
                    {/* Left Column - Task Details (2/3 width) */}
                    <div className="flex-[3] min-w-0">
                        <CardContent className="space-y-4">
                            <div className="flex gap-4 items-start">
                                {/* Task ID - fixed width */}
                                <div className="w-[80px] shrink-0">
                                    <GenericTextField label="ID" value={selectedTask.id > 0 ? selectedTask.id.toString() : "New"} disabled size="small" />
                                </div>

                                <div className="flex-[2]">
                                    {/* Task Title */}
                                    <GenericTextField
                                        label="Title"
                                        value={selectedTask.title}
                                        onChange={(e) => handleFieldChange("title", e.target.value)}
                                        placeholder="Enter task title..."
                                        size="small"
                                        disabled={isDisabled}
                                    />
                                </div>
                                <div className="flex-1">
                                    {/* Date range - warning icon is built into DateRangePicker */}
                                    <DateRangePicker
                                        label="Date Range"
                                        startDate={selectedTask.startDate}
                                        endDate={selectedTask.endDate}
                                        onStartDateChange={(date: Date|null) => handleFieldChange("startDate", date)}
                                        onEndDateChange={(date: Date|null) => handleFieldChange("endDate", date)}
                                        placeholder="Pick date range..."
                                        disabled={isDisabled}
                                        showTime={false}
                                        className="w-full"
                                        limitStartDate={limitDates.limitStartDate}
                                        limitEndDate={limitDates.limitEndDate}
                                    />
                                </div>
                            </div>

                            {/* Task Checklist — collapsed bar + popup (shown when task type has a template) */}
                            {(parseChecklistJson(selectedTask.checklistJson) !== null || getChecklistTemplate(selectedTask.taskType ?? "personal", registriesByType)) && (
                                <TaskChecklist
                                    checklist={parseChecklistJson(selectedTask.checklistJson)}
                                    templateText={getChecklistTemplate(selectedTask.taskType ?? "personal", registriesByType)}
                                    disabled={isDisabled}
                                    onChange={handleChecklistChange}
                                    onSave={handleChecklistSave}
                                    onSetAsDefault={handleSetAsDefault}
                                />
                            )}

                            {/* Note - Rich Text Editor */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Note
                                </label>
                                <div className="h-[660px] overflow-y-auto border rounded-md">
                                    <RichTextEditor
                                        key={`note-${taskKey}`}
                                        value={selectedTask.note || ""}
                                        onChange={(value) => handleFieldChange("note", value)}
                                        placeholder="Enter task notes..."
                                        minHeight="580px"
                                        className="text-left"
                                        disabled={isDisabled}
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
                                disabled={isDisabled}
                                placeholder="Select priority..."
                            />

                            {/* Task Type */}
                            <StatusAutoComplete
                                value={currentTaskTypeValue}
                                onChange={handleTaskTypeChange}
                                options={taskTypeOptions}
                                inputProps={{
                                    name: "taskType",
                                    label: "Task Type",
                                }}
                                disabled={isDisabled}
                                placeholder="Select task type..."
                            />

                            {/* Project Selection */}
                            <GenericAutoComplete
                                value={currentProjectValue}
                                onChange={handleProjectChange}
                                allOptions={projectOptions}
                                inputProps={{
                                    name: "project",
                                    label: isLoadingProjects ? "Project (loading...)" : "Project",
                                }}
                                disabled={isDisabled || isLoadingProjects}
                                disableClearable
                            />

                            {/* Parent Task Selection - disabled if task has subtasks (depth=1 constraint) */}
                            <GenericAutoComplete
                                value={currentParentTaskValue}
                                onChange={handleParentTaskChange}
                                allOptions={parentTaskOptions}
                                inputProps={{
                                    name: "parentTask",
                                    label: hasSubtasks ? "Parent Task (Has subtasks - cannot be subtask)" : "Parent Task (Subtask of)",
                                }}
                                disabled={isDisabled || isLoadingParentTasks || hasSubtasks}
                            />

                            {/* Inner List — Notes/files in task's workspace folder */}
                            {selectedTask.id > 0 && selectedTask.folderWorkspaceItemId && (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Inner List
                                        {isLoadingFolderItems && <Loader2 className="h-3 w-3 animate-spin" />}
                                        {!isDisabled && (
                                            <button
                                                onClick={() => createTaskNote(selectedTask)}
                                                className="ml-auto p-0.5 rounded hover:bg-muted transition-colors"
                                                title="Create note"
                                            >
                                                <FilePlus className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </label>
                                    {folderItems.length > 0 ? (
                                        <div className="space-y-1 max-h-[160px] overflow-y-auto">
                                            {folderItems.map((item) => (
                                                <div
                                                    key={item.workspaceItemId}
                                                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm bg-muted/50 hover:bg-muted cursor-pointer"
                                                    onClick={() => openFolderItem(item)}
                                                    title={item.name}
                                                >
                                                    <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                    <span className="flex-1 truncate hover:text-primary hover:underline text-left">
                                                        {item.name.length > 26 ? item.name.slice(0, 26) + "..." : item.name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        !isLoadingFolderItems && (
                                            <p className="text-xs text-muted-foreground">No notes yet</p>
                                        )
                                    )}
                                </div>
                            )}

                            {/* Linked Keywords Section */}
                            {selectedTask.id > 0 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Link2 className="h-4 w-4" />
                                        Linked Keywords
                                        {isLoadingLinkedKeywords && <Loader2 className="h-3 w-3 animate-spin" />}
                                        {!isDisabled && (
                                            <div className="ml-auto flex items-center gap-1">
                                                {!selectedTask.folderWorkspaceItemId && (
                                                    <button
                                                        onClick={() => createTaskNote(selectedTask)}
                                                        className="p-0.5 rounded hover:bg-muted transition-colors"
                                                        title="Create note"
                                                    >
                                                        <FilePlus className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={handleOpenLinkPalette}
                                                    className="p-0.5 rounded hover:bg-muted transition-colors"
                                                    title="Link a keyword"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </label>
                                    {linkedKeywords.length > 0 ? (
                                        <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                            {[...linkedKeywords]
                                                .sort((a, b) => {
                                                    const order: Record<string, number> = { workspace: 0, folder: 1, note: 2, file: 3, h1: 4, h2: 4, h3: 4, h4: 4, h5: 4, h6: 4, external: 5 };
                                                    return (order[a.type] ?? 6) - (order[b.type] ?? 6);
                                                })
                                                .map((lk) => {
                                                    return (
                                                        <div
                                                            key={lk.linkId}
                                                            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm bg-muted/50 hover:bg-muted group"
                                                        >
                                                            <KeywordIconRenderer
                                                                type={lk.type}
                                                                icon={lk.icon}
                                                                color={lk.color}
                                                                className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                                                            />
                                                            <span
                                                                className="flex-1 text-left truncate cursor-pointer hover:text-primary hover:underline"
                                                                onClick={() => handleNavigateKeyword(lk as any)}
                                                                title={lk.longLink || lk.name}
                                                            >
                                                                {lk.name.length > 26 ? lk.name.slice(0, 26) + "..." : lk.name}
                                                            </span>
                                                            {!isDisabled && (
                                                                <button
                                                                    onClick={(e) => handleUnlinkKeyword(e, lk.linkId, lk.name)}
                                                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-opacity"
                                                                    title="Unlink keyword"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    ) : (
                                        !isLoadingLinkedKeywords && (
                                            <p className="text-xs text-muted-foreground">No linked keywords</p>
                                        )
                                    )}
                                </div>
                            )}

                            <p className="text-xs text-left text-muted-foreground leading-relaxed">
                                Created: {formatDate(selectedTask.createdAt)}
                                {selectedTask.updatedAt && <> · Updated: {formatDate(selectedTask.updatedAt)}</>}
                                {selectedTask.deletedAt && <> · Deleted: {formatDate(selectedTask.deletedAt)}</>}
                            </p>
                        </CardContent>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}
