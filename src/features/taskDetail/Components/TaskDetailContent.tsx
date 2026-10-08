/**
 * Task Detail Content Component
 * Form for editing task details
 * Used within ProjectDetailContent TabBar when a task tab is active
 *
 * Layout (#1514, Linear-style): header (id · large title · property chips) on top,
 * then a flex two-column body separated by hairlines.
 * Left column: TaskDetailSection (fills remaining height).
 * Right column: Notes & Links, linked keywords, timestamps — scrolls independently.
 */

import React from "react";
import { AlertCircle, Diamond } from "lucide-react";
import { GenericTextField, Alert, AlertDescription } from "@/shared";
import { TaskDetailSection } from "./TaskDetailSection";
import { TaskNotesLinks } from "./small/TaskNotesLinks";
import { TaskPropertyChips } from "./small/TaskPropertyChips";
import { TaskLinkedKeywords } from "./small/TaskLinkedKeywords";
import { SectionTitle } from "./small/SectionTitle";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { formatDate } from "../utils/TaskDetail.utils";
import { useTaskDetailFormHelper } from "../hooks/useTaskDetailForm.helper";

/**
 * TaskDetailContent
 * Form for editing task details with 4-section tabs
 */
export function TaskDetailContent() {
    // ── Computed values (from selectors) ──────────────────────────────────────
    const { selectedTask, currentProject, isDisabled, isProjectInactive } = useTaskDetailSelector();

    // ── Handlers (from helpers — each called directly) ─────────────────────
    const { handleFieldChange } = useTaskDetailFormHelper();

    // ── Early return ──────────────────────────────────────────────────────────
    if (!selectedTask) {
        return (
            <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                <p>No task selected</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden px-6 pt-4">
            {/* Project inactive alert */}
            {isProjectInactive && (
                <Alert variant="default" className="mb-3 shrink-0 border-sa-amber/35 bg-sa-amber/10 py-2">
                    <AlertCircle className="h-4 w-4 text-sa-amber-ink" />
                    <AlertDescription className="text-[13px] text-sa-amber-ink">
                        This task belongs to a {currentProject?.status} project. Editing is disabled.
                    </AlertDescription>
                </Alert>
            )}

            {/* ── Header: id · title · property chips ── */}
            <div className="shrink-0 space-y-1.5 pb-3">
                <div className="flex h-5 items-center gap-2 text-xs">
                    <span className="font-mono text-muted-foreground">
                        {selectedTask.id > 0 ? `#${selectedTask.id}` : "New task"}
                    </span>
                    {selectedTask.isMilestone && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Diamond className="h-3 w-3 text-sa-amber" />
                            Milestone
                        </span>
                    )}
                </div>
                <GenericTextField
                    value={selectedTask.title}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    placeholder="Task title"
                    aria-label="Title"
                    disabled={isDisabled}
                    className="-mx-1.5 h-9 border-transparent bg-transparent px-1.5 text-xl font-medium tracking-tight hover:border-sa-border focus-visible:border-sa-border-strong focus-visible:ring-0 disabled:cursor-default disabled:opacity-100 disabled:hover:border-transparent"
                />
                <div className="-mx-1.5">
                    <TaskPropertyChips />
                </div>
            </div>

            {/* ── Body: sections (left) | side info (right) ── */}
            <div className="flex min-h-0 flex-1 border-t border-sa-border">
                {/* ── Left Column ── */}
                <div className="flex min-w-0 flex-[3] flex-col pb-4 pr-6 pt-2">
                    <div className="min-h-0 flex-1">
                        <TaskDetailSection />
                    </div>
                </div>

                {/* ── Right Column — scrolls independently ── */}
                <div className="min-w-[220px] max-w-[320px] flex-1 overflow-y-auto border-l border-sa-border pb-4 pl-5 pt-3">
                    <div className="space-y-4">
                        {/* Notes & Links — task folder notes + links (task #1487) */}
                        <TaskNotesLinks />

                        {/* Linked Keywords */}
                        <TaskLinkedKeywords />

                        <div className="space-y-1">
                            <SectionTitle title="Activity" />
                            <p className="text-left text-xs leading-relaxed text-muted-foreground">
                                Created {formatDate(selectedTask.createdAt)}
                                {selectedTask.updatedAt && <><br />Updated {formatDate(selectedTask.updatedAt)}</>}
                                {selectedTask.deletedAt && (
                                    <><br /><span className="text-sa-danger">Deleted {formatDate(selectedTask.deletedAt)}</span></>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
