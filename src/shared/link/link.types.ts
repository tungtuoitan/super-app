import type { linkConstants } from "./link.constants";

export type LinkKind = (typeof linkConstants.kinds)[keyof typeof linkConstants.kinds];

/** One row of GET /api/task/{id}/links or /api/project/{id}/links. */
export interface LinkDTO {
    workspaceItemId: number;
    workspaceId: number;
    parentId: number | null;
    entityType: 2 | 3 | 4;
    entityId: number;
    name: string;
    url?: string | null;
    mimeType?: string | null;
    isLink: boolean;
    /** pro.task_workspace_item.id; null = link that only sits in the task folder. */
    taskWorkspaceItemId?: number | null;
    createdAt?: string | null;
}

export interface AddLinkRequest {
    url?: string;
    name?: string;
    workspaceItemId?: number;
}

export interface UpdateFileRequest {
    name?: string;
    url?: string;
}

export interface LinkFormValues {
    name: string;
    url: string;
}

export interface LinkDialogOptions {
    title: string;
    initial?: Partial<LinkFormValues>;
    /** false = rename only (plain uploaded file). */
    showUrl?: boolean;
    submitLabel?: string;
    onSubmit: (values: LinkFormValues) => Promise<void>;
}
