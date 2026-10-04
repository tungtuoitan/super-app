/**
 * Task Detail Utilities
 * Pure functions — no hooks, no React.
 * Colors, date formatting, DTO → domain transform.
 */

import { constants } from "@/shared";
import { projectConstants } from "@/features/project/project.constants";
import { parseInstant, parseDateOnly } from "@/shared";
import {Task, TaskDTO} from "../types/task.types";

/** Task status bg/text colors from constants */
export const getTaskStatusColors = (status: string) => {
    const colors = projectConstants.optionColor.taskStatus.colors[status];
    return colors ?? projectConstants.optionColor.taskStatus.default;
};

/** Task priority bg/text colors from constants */
export const getTaskPriorityColors = (priority: string) => {
    const colors = projectConstants.optionColor.taskPriority.colors[priority];
    return colors ?? projectConstants.optionColor.taskPriority.default;
};

/** Format a Date for UI display */
export const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

/**
 * Transform task DTOs (string dates) -> domain models (Date objects).
 * Calendar dates (start/end, project/parent ranges) -> parseDateOnly, instants -> parseInstant.
 */
export const transformTaskData = (dtos: TaskDTO[]): Task[] =>
    dtos.map((dto) => ({
        id: dto.id,
        projectId: dto.projectId,
        parentTaskId: dto.parentTaskId,
        type: dto.type,
        taskType: dto.taskType || "personal",
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        startDate: parseDateOnly(dto.startDate),
        endDate: parseDateOnly(dto.endDate),
        orderIndex: dto.orderIndex,
        createdAt: parseInstant(dto.createdAt) || new Date(),
        updatedAt: parseInstant(dto.updatedAt),
        deletedAt: parseInstant(dto.deletedAt),
        folderWorkspaceItemId: dto.folderWorkspaceItemId,
        checklistJson: dto.checklistJson ?? null,
        processJson: dto.processJson ?? null,
        customTabsJson: dto.customTabsJson ?? null,
        isMilestone: dto.isMilestone ?? false,
        projectStartDate: parseDateOnly(dto.projectStartDate),
        projectEndDate: parseDateOnly(dto.projectEndDate),
        parentStartDate: parseDateOnly(dto.parentStartDate),
        parentEndDate: parseDateOnly(dto.parentEndDate),
    }));



