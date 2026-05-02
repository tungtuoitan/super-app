/**
 * Task — core domain types shared across grid, detail, and all task features
 */

export interface Task {
    id: number;
    projectId: number;
    parentTaskId?: number | null;
    type: string;
    taskType: string;
    title: string;
    note?: string | null;
    status: string;
    priority: string;
    startDate?: Date | null;
    endDate?: Date | null;
    orderIndex: number;
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt?: Date | null;

    // Workspace folder linked to this task (set when first note is created)
    folderWorkspaceItemId?: number | null;

    /** JSON checklist stored as string: ChecklistJSON serialized */
    checklistJson?: string | null;

    /** JSON process/step stored as string: same structure as ChecklistJSON */
    processJson?: string | null;

    /** JSON custom tabs stored as string: CustomTabsJSON serialized */
    customTabsJson?: string | null;

    // Limit dates for warning display (parsed from backend)
    projectStartDate?: Date | null;
    projectEndDate?: Date | null;
    parentStartDate?: Date | null;
    parentEndDate?: Date | null;
}

export interface TaskPaginationState {
    pageIndex: number;
    pageSize: number;
}

/** DTO shape returned by / sent to the task API (dates as strings) */
export interface TaskDTO {
    id: number;
    projectId: number;
    parentTaskId?: number | null;
    type: string;
    taskType: string;
    title: string;
    note?: string | null;
    status: string;
    priority: string;
    startDate?: string | null;
    endDate?: string | null;
    orderIndex: number;
    createdAt: string;
    updatedAt?: string | null;
    deletedAt?: string | null;

    // Workspace folder linked to this task
    folderWorkspaceItemId?: number | null;

    // Limit dates from backend for warning display
    projectStartDate?: string | null;
    projectEndDate?: string | null;
    parentStartDate?: string | null;
    parentEndDate?: string | null;

    /** JSON checklist stored as string: { groups: [...] } */
    checklistJson?: string | null;

    /** JSON process/step stored as string: same structure as checklistJson */
    processJson?: string | null;

    /** JSON custom tabs stored as string */
    customTabsJson?: string | null;
}

/**
 * Project — minimal project info needed by taskDetail
 * Used for project cache in taskDetail feature
 */
export interface Project {
    id: number;
    name: string;
    status: string;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    deletedAt?: Date | string | null;
    workspaceId?: number | null
}