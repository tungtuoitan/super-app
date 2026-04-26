/**
 * MultiProjectKanbanView - Kanban Board for Multiple Projects
 * Displays tasks from multiple projects grouped by status.
 *
 * Pure UI — logic lives in useMultiProjectKanbanSelector, useMultiProjectKanbanHelper,
 * useMultiProjectKanbanHeadless.
 * NO props — reads projectIds/projects from useMultiTimelineStore.
 */

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useTaskStore } from "@/features/task/store/useTask.store";
import { useTaskTabHelper } from "@/features/task/hooks/useTaskTab.helper";
import { useMultiTimelineStore } from "@/features/multiProject/store/useMultiTimeline.store";
import { useMultiProjectKanbanSelector } from "../Selectors/useMultiProjectKanban.selector";
import { useMultiProjectKanbanHelper } from "../hooks/mpTaskKanban/useMultiProjectKanban.helper";
import { useMultiProjectKanbanHeadless } from "../hooks/mpTaskKanban/useMultiProjectKanban.headless";
import { KanbanColumn } from "./small/KanbanColumn";

export function MultiProjectKanbanView() {
    const { taskGridIsLoading, taskGridError } = useTaskStore();
    const { openTaskTab } = useTaskTabHelper();
    const { projects } = useMultiTimelineStore();

    // ── Computed values (from selector) ──────────────────
    const { statusOptions, filteredTasks, tasksByStatus } = useMultiProjectKanbanSelector();

    // ── Handlers (from helper) ───────────────────────────
    const { canDropToColumn, handleDropTask } = useMultiProjectKanbanHelper();

    // ── Side-effects (headless) ──────────────────────────
    // useMultiProjectKanbanHeadless();

    // Show subtasks toggle (default: on)
    const [showSubtasks, setShowSubtasks] = useState(true);

    return (
        <div className="w-full h-full flex flex-col relative">
            {taskGridIsLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {taskGridError && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertDescription>Failed to load tasks</AlertDescription>
                    </Alert>
                </div>
            )}

            <div className="flex-1 overflow-x-auto p-4">
                <div className="flex gap-4 h-full">
                    {statusOptions.map((status) => (
                        <KanbanColumn
                            key={status.code}
                            status={status}
                            tasks={tasksByStatus[status.code] || []}
                            allTasks={filteredTasks}
                            showSubtasks={showSubtasks}
                            onTaskClick={openTaskTab}
                            onDropTask={handleDropTask}
                            canDropToColumn={canDropToColumn}
                        />
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between px-4 py-1 bg-background border-t">
                <div className="text-sm text-muted-foreground">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} from {projects.length} project
                    {projects.length !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="show-subtasks-multi"
                        checked={showSubtasks}
                        onCheckedChange={(checked) => setShowSubtasks(!!checked)}
                    />
                    <Label htmlFor="show-subtasks-multi" className="text-xs text-muted-foreground cursor-pointer">
                        Show subtasks
                    </Label>
                </div>
            </div>
        </div>
    );
}
