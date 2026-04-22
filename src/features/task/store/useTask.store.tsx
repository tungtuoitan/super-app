/**
 * Task Store — barrel re-export + composite provider
 *
 * Combines TaskGridStore (grid state) and TaskDetailStore (detail editor state).
 * Use `useTaskStore()` for backward compatibility (returns both stores merged).
 * Prefer the specific hooks for new code:
 *   - `useTaskGridStore()` for grid state
 *   - `useTaskDetailStore()` for detail state
 */

import React from "react";
import { TaskGridProvider, useTaskGridStore } from "./useTaskGrid.store";
import { TaskDetailProvider, useTaskDetailStore } from "./useTaskDetail.store";
import { TaskChecklistProvider } from "./useTaskChecklist.store";
import { TaskProcessProvider } from "./useTaskProcess.store";
import { TaskDetailSectionProvider } from "./useTaskDetailSection.store";
import { TaskSectionProvider } from "./useTaskSection.store";
import { TaskCommentProvider } from "./useTaskComment.store";
import { TaskTimelineProvider } from "./useTaskTimeline.store";

// ── Re-export shared types ─────────────────────────────────────────────────

export type { Task, TaskPaginationState } from "../types/task.types";
export type { TaskFolderItem, LinkedKeyword } from "../types/taskDetail.types";
export type { TaskGridContextData } from "./useTaskGrid.store";
export type { TaskDetailContextData } from "./useTaskDetail.store";
export { useTaskGridStore } from "./useTaskGrid.store";
export { useTaskDetailStore } from "./useTaskDetail.store";

// ── Backward-compatible combined hook ──────────────────────────────────────

/**
 * @returns Combined grid + detail state. Prefer useTaskGridStore() or useTaskDetailStore() for new code.
 */
export const useTaskStore = () => {
    const grid = useTaskGridStore();
    const detail = useTaskDetailStore();
    return { ...grid, ...detail };
};

// ── Composite provider ─────────────────────────────────────────────────────

export const TaskProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <TaskGridProvider>
        <TaskDetailProvider>
            <TaskChecklistProvider>
                <TaskProcessProvider>
                    <TaskDetailSectionProvider>
                        <TaskSectionProvider>
                            <TaskCommentProvider>
                                <TaskTimelineProvider>
                                    {children}
                                </TaskTimelineProvider>
                            </TaskCommentProvider>
                        </TaskSectionProvider>
                    </TaskDetailSectionProvider>
                </TaskProcessProvider>
            </TaskChecklistProvider>
        </TaskDetailProvider>
    </TaskGridProvider>
);
