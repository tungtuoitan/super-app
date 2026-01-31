/**
 * Task Detail Content Component
 * Form for editing task details
 * Used within ProjectDetailContent TabBar when a task tab is active
 */

import React, { useEffect, useMemo } from "react";
import { GenericTextField, StatusAutoComplete, IStatusOption, RichTextEditor } from "@/shared/components";
import { CardContent } from "@/Components/ui/card";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { FileText, Calendar } from "lucide-react";
import { Task } from "@/store/task/useTask.store";
import { useGeneralStore } from "@/store/general/General.store";
import { useEditorTabsStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { BaseTab } from "@/types/editor/tab.types";

/**
 * Get task status colors
 */
const getTaskStatusColors = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
        open: { bg: "#238636", text: "#ffffff" },
        in_progress: { bg: "#d29922", text: "#ffffff" },
        completed: { bg: "#8957e5", text: "#ffffff" },
    };
    return colors[status] || { bg: "#6e7681", text: "#ffffff" };
};

/**
 * Get task priority colors
 */
const getTaskPriorityColors = (priority: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
        low: { bg: "#6e7681", text: "#ffffff" },
        medium: { bg: "#d29922", text: "#ffffff" },
        high: { bg: "#da3633", text: "#ffffff" },
        urgent: { bg: "#8957e5", text: "#ffffff" },
    };
    return colors[priority] || { bg: "#6e7681", text: "#ffffff" };
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

    // Find the task tab by ID
    const taskTab = openTabs.find((tab) => tab.id === taskTabId && tab.type === constants.vscode.tab.tabTypes.task);
    const selectedTask = taskTab ? (taskTab.data as Task) : undefined;

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

    // Format date for input
    const formatDateForInput = (date: Date | null | undefined): string => {
        if (!date) return "";
        return date.toISOString().split("T")[0];
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
                                <div className="flex-1 space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formatDateForInput(selectedTask.startDate)}
                                        onChange={(e) => {
                                            const date = e.target.value ? new Date(e.target.value) : null;
                                            handleFieldChange("startDate", date);
                                        }}
                                        className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                                        disabled={isDeleted}
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formatDateForInput(selectedTask.endDate)}
                                        onChange={(e) => {
                                            const date = e.target.value ? new Date(e.target.value) : null;
                                            handleFieldChange("endDate", date);
                                        }}
                                        className="w-full px-3 py-2 text-sm border rounded-md bg-background"
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
                                <RichTextEditor
                                    key={`note-${taskKey}`}
                                    value={selectedTask.note || ""}
                                    onChange={(value) => handleFieldChange("note", value)}
                                    placeholder="Enter task notes..."
                                    // minHeight="200px"
                                    className="h-[580px] text-left"
                                    disabled={isDeleted}
                                />
                            </div>
                        </CardContent>
                    </div>

                    {/* Right Column - Metadata (1/3 width) */}
                    <div className="flex-1 min-w-0">
                        <CardContent className="space-y-7">
                            {/* Status and Priority row */}
                            <div className="flex">
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
                            </div>
                            <div className="flex relative top-[-10px]">
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
                            </div>
                            <div className="flex gap-4">
                            </div>
                            <GenericTextField label="Task ID" value={selectedTask.id > 0 ? selectedTask.id.toString() : "New (Unsaved)"} disabled size="small" />

                            <GenericTextField label="Project ID" value={selectedTask.projectId.toString()} disabled size="small" />

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
