import type { WorkspaceFolderItem, WorkspaceNoteItem } from "../types/workspace-v2.types";

export function findFolderInWorkspace(workspace: any, workspaceId: number, folderWorkspaceItemId: number): WorkspaceFolderItem | null {
    if (!workspace || workspace.id !== workspaceId) return null;
    const item = workspace.flatData?.find(
        (item: any) => item.id === folderWorkspaceItemId && item.entityType === 2
    );
    return item as WorkspaceFolderItem | null;
}

export function findNoteInWorkspace(workspace: any, workspaceId: number, noteWorkspaceItemId: number): WorkspaceNoteItem | null {
    if (!workspace || workspace.id !== workspaceId) return null;
    const item = workspace.flatData?.find(
        (item: any) => item.id === noteWorkspaceItemId && item.entityType === 3
    );
    return item as WorkspaceNoteItem | null;
}

export function findNoteByEntityId(workspace: any, noteEntityId: number): WorkspaceNoteItem | null {
    if (!workspace || noteEntityId < 0) {
        return noteEntityId < 0 ? ({} as WorkspaceNoteItem) : null;
    }
    const item = workspace.flatData?.find(
        (item: any) => item.data?.id === noteEntityId && item.entityType === 3
    );
    return item as WorkspaceNoteItem | null;
}
