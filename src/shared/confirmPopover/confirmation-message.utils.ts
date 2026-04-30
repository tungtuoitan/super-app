type EntityType = "note" | "workspace" | "folder" | "file" | "task";
type DeleteType = "soft-delete" | "hard-delete";

export interface GetConfirmMessageParams {
    type: DeleteType;
    entityType: EntityType;
    count: number;
    isMultiple: boolean;
    entityName?: string;
    childCount?: number;
}

export interface ConfirmMessage {
    title: string;
    subtitle?: string;
}

export const getConfirmMessage = (params: GetConfirmMessageParams): ConfirmMessage => {
    const { type, entityType, count, isMultiple, entityName, childCount = 0 } = params;

    if (type === "soft-delete") {
        if (entityType === "task") {
            return isMultiple
                ? { title: `Delete ${count} tasks?`, subtitle: `Are you sure you want to delete ${count} selected tasks?` }
                : { title: "Delete this task?", subtitle: "This task will be moved to trash." };
        }
        if (entityType === "note" || entityType === "file") {
            if (isMultiple) {
                const label = entityType === "file" ? "files" : "notes";
                return { title: `Delete ${count} ${label}?`, subtitle: `Are you sure you want to delete ${count} selected ${label}?` };
            } else {
                const label = entityType === "file" ? "file" : "note";
                return entityName
                    ? { title: `Delete "${entityName}"?`, subtitle: `This ${label} will be moved to trash.` }
                    : { title: `Delete this ${label}?`, subtitle: `Are you sure you want to delete this ${label}?` };
            }
        } else if (entityType === "workspace") {
            return isMultiple
                ? { title: `Delete ${count} workspaces?`, subtitle: `This will also delete ALL folders, notes, and files in these workspaces.` }
                : { title: "Delete this workspace?", subtitle: "This will also delete ALL folders, notes, and files in this workspace." };
        } else {
            if (isMultiple) {
                return { title: `Delete ${count} folders?`, subtitle: `Are you sure you want to delete ${count} selected folders?` };
            } else {
                return entityName
                    ? { title: `Delete "${entityName}"?`, subtitle: childCount > 0 ? `This folder contains ${childCount} child folder(s).` : `This folder will be moved to trash.` }
                    : { title: "Delete this folder?", subtitle: undefined };
            }
        }
    } else {
        if (entityType === "note" || entityType === "file") {
            if (isMultiple) {
                const label = entityType === "file" ? "files" : "notes";
                const content = entityType === "file" ? "files" : "note content";
                return { title: `⚠️ Permanently delete ${count} ${label}?`, subtitle: `This action CANNOT be undone. All ${content} will be LOST FOREVER.` };
            } else {
                const content = entityType === "file" ? "file" : "note content";
                return entityName
                    ? { title: `⚠️ Permanently delete "${entityName}"?`, subtitle: `This action CANNOT be undone. The ${content} will be LOST FOREVER.` }
                    : { title: `⚠️ Permanently delete this ${entityType}?`, subtitle: `This action CANNOT be undone. All ${content} will be LOST FOREVER.` };
            }
        } else if (entityType === "workspace") {
            return isMultiple
                ? { title: `⚠️ Permanently delete ${count} workspaces?`, subtitle: "This will PERMANENTLY delete ALL contents (folders, notes, files). This action CANNOT be undone." }
                : { title: "⚠️ Permanently delete this workspace?", subtitle: "This will PERMANENTLY delete ALL contents (folders, notes, files). This action CANNOT be undone." };
        } else {
            if (isMultiple) {
                return { title: `⚠️ Permanently delete ${count} folders?`, subtitle: "This will PERMANENTLY delete ALL their contents (notes, files, subfolders). This action CANNOT be undone." };
            } else {
                return entityName && childCount > 0
                    ? { title: `⚠️ Permanently delete "${entityName}"?`, subtitle: `This will PERMANENTLY delete this folder and ${childCount} child folder(s) with ALL their contents. This action CANNOT be undone.` }
                    : entityName
                    ? { title: `⚠️ Permanently delete "${entityName}"?`, subtitle: "This will PERMANENTLY delete ALL contents. This action CANNOT be undone." }
                    : { title: "⚠️ Permanently delete this folder?", subtitle: "This action CANNOT be undone. All folder content will be LOST FOREVER." };
            }
        }
    }
};
