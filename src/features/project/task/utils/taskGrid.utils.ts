import type { TaskDTO, Task } from "@/features/taskDetail";
import { parseInstant, parseDateOnly } from "@/shared";

/**
 * Transform task DTOs (dates as strings) to domain models (dates as Date objects)
 * Calendar dates (startDate/endDate) -> parseDateOnly, instants -> parseInstant
 */
export const transformTaskData = (dtos: TaskDTO[]): Task[] => {
    return dtos.map((dto) => ({
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
        // Limit dates for warning display
        projectStartDate: parseDateOnly(dto.projectStartDate),
        projectEndDate: parseDateOnly(dto.projectEndDate),
        parentStartDate: parseDateOnly(dto.parentStartDate),
        parentEndDate: parseDateOnly(dto.parentEndDate),
    }));
};
