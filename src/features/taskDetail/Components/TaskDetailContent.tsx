/**
 * Task Detail Content Component
 * Form for editing task details
 * Used within ProjectDetailContent TabBar when a task tab is active
 *
 * Layout: fixed header + flex two-column body.
 * Left column: header fields (shrink) + TaskDetailSection (fills remaining).
 * Right column: metadata, scrolls independently.
 * Comment section scrolls inside its own container.
 */

import React from "react";
import {
    GenericTextField,
    StatusAutoComplete,
    DateRangePicker,
    GenericAutoComplete,
} from "@/shared/components";
import { CardContent } from "@/shared/components/ui/card";
import { FileText, AlertCircle, Link2, X, Loader2, Plus, FilePlus, FileIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { KeywordIconRenderer } from "@/shared/components/KeywordIconRenderer";
import { TaskDetailSection } from "./TaskDetailSection";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskDetailKeywordSelector } from "../Selectors/TaskDetailKeywordSelector";
import { useTaskDetailFormSelector } from "../Selectors/TaskDetailFormSelector";
import { useTaskDetailHelper } from "../hooks/useTaskDetail.helper";
import { formatDate } from "../utils/TaskDetail.utils";
import { useTaskDetailFormHelper } from "../hooks/useTaskDetailForm.helper";
import { useTaskWorkspaceItemHelper } from "../hooks/useTaskWorkspaceItem.helper";
import { useTaskDetailStore } from "../store/useTaskDetail.store";

/**
 * TaskDetailContent
 * Form for editing task details with 4-section tabs
 */
export function TaskDetailContent() {
    // ── Computed values (from selectors) ──────────────────────────────────────
    const {
        selectedTask,
        currentProject,
        isDeleted,
        isDisabled,
        isProjectInactive,
        hasSubtasks,
        statusOptions,
        priorityOptions,
        taskTypeOptions,
        currentStatusValue,
        currentPriorityValue,
        currentTaskTypeValue,
        limitDates,
    } = useTaskDetailSelector();

    const { sortedLinkedKeywords } = useTaskDetailKeywordSelector();
    const { currentProjectValue, currentParentTaskValue } = useTaskDetailFormSelector();

    // ── State (from store) ────────────────────────────────────────────────────
    const {
        linkedKeywords,
        isLoadingLinkedKeywords,
        folderItems,
        isLoadingFolderItems,
        projectOptions,
        isLoadingProjects,
        parentTaskOptions,
        isLoadingParentTasks,
    } = useTaskDetailStore();

    // ── Handlers (from helpers — each called directly) ─────────────────────
    const {
        handleFieldChange,
        handleStatusChange,
        handlePriorityChange,
        handleTaskTypeChange,
        handleProjectChange,
        handleParentTaskChange,
    } = useTaskDetailFormHelper();

    const {
        handleOpenLinkPalette,
        handleNavigateKeyword,
        handleUnlinkKeyword,
    } = useTaskDetailHelper();

    const { openFolderItem, createTaskNote } = useTaskWorkspaceItemHelper();

    // ── Early return ──────────────────────────────────────────────────────────
    if (!selectedTask) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No task selected</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden px-6 py-4">
            {/* Project inactive alert */}
            {isProjectInactive && (
                <Alert variant="default" className="mb-4 border-yellow-500/50 bg-yellow-500/10 shrink-0">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-500">
                        This task belongs to a {currentProject?.status} project. Editing is disabled.
                    </AlertDescription>
                </Alert>
            )}

            {/* Two-column layout: Left (3/4) fills height | Right (1/4) scrolls independently */}
            <div className="flex flex-1 min-h-0">
                {/* ── Left Column ── */}
                <div className="flex-[3] min-w-0 flex flex-col">
                    <CardContent className="flex flex-col flex-1 min-h-0 space-y-4">
                        {/* Header fields — fixed at top */}
                        <div className="flex gap-4 items-start shrink-0">
                            <div className="w-[80px] shrink-0">
                                <GenericTextField
                                    label="ID"
                                    value={selectedTask.id > 0 ? selectedTask.id.toString() : "New"}
                                    disabled
                                    size="small"
                                />
                            </div>
                            <div className="flex-[2]">
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
                                <DateRangePicker
                                    label="Date Range"
                                    startDate={selectedTask.startDate}
                                    endDate={selectedTask.endDate}
                                    onStartDateChange={(date: Date | null) => handleFieldChange("startDate", date)}
                                    onEndDateChange={(date: Date | null) => handleFieldChange("endDate", date)}
                                    placeholder="Pick date range..."
                                    disabled={isDisabled}
                                    showTime={false}
                                    className="w-full"
                                    limitStartDate={limitDates.limitStartDate}
                                    limitEndDate={limitDates.limitEndDate}
                                />
                            </div>
                        </div>

                        {/* 4-Section Tabs — fills remaining height */}
                        <div className="flex-1 min-h-0">
                            <TaskDetailSection />
                        </div>
                    </CardContent>
                </div>

                {/* ── Right Column — scrolls independently ── */}
                <div className="flex-1 min-w-0 overflow-y-auto">
                    <CardContent className="space-y-4">
                        <StatusAutoComplete
                            value={currentStatusValue}
                            onChange={handleStatusChange}
                            options={statusOptions}
                            inputProps={{ name: "status", label: "Status" }}
                            disabled={isDeleted}
                            placeholder="Select status..."
                            disabledCodes={["completed"]}
                        />

                        <StatusAutoComplete
                            value={currentPriorityValue}
                            onChange={handlePriorityChange}
                            options={priorityOptions}
                            inputProps={{ name: "priority", label: "Priority" }}
                            disabled={isDisabled}
                            placeholder="Select priority..."
                        />

                        <StatusAutoComplete
                            value={currentTaskTypeValue}
                            onChange={handleTaskTypeChange}
                            options={taskTypeOptions}
                            inputProps={{ name: "taskType", label: "Task Type" }}
                            disabled={isDisabled}
                            placeholder="Select task type..."
                        />

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

                        <GenericAutoComplete
                            value={currentParentTaskValue}
                            onChange={handleParentTaskChange}
                            allOptions={parentTaskOptions}
                            inputProps={{
                                name: "parentTask",
                                label: hasSubtasks
                                    ? "Parent Task (Has subtasks - cannot be subtask)"
                                    : "Parent Task (Subtask of)",
                            }}
                            disabled={isDisabled || isLoadingParentTasks || hasSubtasks}
                        />

                        {/* Inner List */}
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

                        {/* Linked Keywords */}
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
                                        {sortedLinkedKeywords
                                            .map((lk) => (
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
                                            ))}
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
    );
}
