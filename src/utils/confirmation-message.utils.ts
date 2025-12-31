/**
 * Confirmation Message Utilities
 * Centralized confirmation message generation for delete operations
 */

type EntityType = "note" | "workspace" | "folder" | "file";
type DeleteType = "soft-delete" | "hard-delete";

interface GetConfirmMessageParams {
    type: DeleteType;
    entityType: EntityType;
    count: number;
    isMultiple: boolean;
    entityName?: string;
    childCount?: number;
}

interface ConfirmMessage {
    title: string;
    subtitle?: string;
}

/**
 * Generate confirmation message based on entity type and delete type
 * 
 * @param params - Configuration for confirmation message
 * @returns Object with title and optional subtitle
 */
export const getConfirmMessage = (params: GetConfirmMessageParams): ConfirmMessage => {
    const { type, entityType, count, isMultiple, entityName, childCount = 0 } = params;

    if (type === "soft-delete") {
        // ==================== SOFT DELETE MESSAGES ====================
        if (entityType === "note" || entityType === "file") {
            // Note and file share the same messages
            if (isMultiple) {
                const label = entityType === "file" ? "files" : "notes";
                return {
                    title: `Delete ${count} ${label}?`,
                    subtitle: `Are you sure you want to delete ${count} selected ${label}?`
                };
            } else {
                if (entityName) {
                    const label = entityType === "file" ? "file" : "note";
                    return {
                        title: `Delete "${entityName}"?`,
                        subtitle: `This ${label} will be moved to trash.`
                    };
                } else {
                    const label = entityType === "file" ? "file" : "note";
                    return {
                        title: `Delete this ${label}?`,
                        subtitle: `Are you sure you want to delete this ${label}?`
                    };
                }
            }
        } else if (entityType === "workspace") {
            return isMultiple
                ? {
                    title: `Delete ${count} workspaces?`,
                    subtitle: `This will also delete ALL folders, notes, and files in these workspaces.`
                }
                : {
                    title: "Delete this workspace?",
                    subtitle: "This will also delete ALL folders, notes, and files in this workspace."
                };
        } else {
            // folder
            if (isMultiple) {
                return {
                    title: `Delete ${count} folders?`,
                    subtitle: `Are you sure you want to delete ${count} selected folders?`
                };
            } else {
                // Single folder with optional name and child count
                if (entityName) {
                    return {
                        title: `Delete "${entityName}"?`,
                        subtitle: childCount > 0 ? `This folder contains ${childCount} child folder(s).` : `This folder will be moved to trash.`
                    };
                } else {
                    return {
                        title: "Delete this folder?",
                        subtitle: undefined
                    };
                }
            }
        }
    } else {
        // ==================== HARD DELETE MESSAGES ====================
        if (entityType === "note" || entityType === "file") {
            // Note and file have slightly different messages
            if (isMultiple) {
                const label = entityType === "file" ? "files" : "notes";
                const content = entityType === "file" ? "files" : "note content";
                return {
                    title: `⚠️ Permanently delete ${count} ${label}?`,
                    subtitle: `This action CANNOT be undone. All ${content} will be LOST FOREVER.`
                };
            } else {
                const content = entityType === "file" ? "file" : "note content";
                if (entityName) {
                    const label = entityType === "file" ? "file" : "note";
                    return {
                        title: `⚠️ Permanently delete "${entityName}"?`,
                        subtitle: `This action CANNOT be undone. The ${content} will be LOST FOREVER.`
                    };
                } else {
                    const label = entityType === "file" ? "file" : "note";
                    return {
                        title: `⚠️ Permanently delete this ${label}?`,
                        subtitle: `This action CANNOT be undone. All ${content} will be LOST FOREVER.`
                    };
                }
            }
        } else if (entityType === "workspace") {
            return isMultiple
                ? {
                    title: `⚠️ Permanently delete ${count} workspaces?`,
                    subtitle: "This will PERMANENTLY delete ALL contents (folders, notes, files). This action CANNOT be undone."
                }
                : {
                    title: "⚠️ Permanently delete this workspace?",
                    subtitle: "This will PERMANENTLY delete ALL contents (folders, notes, files). This action CANNOT be undone."
                };
        } else {
            // folder
            if (isMultiple) {
                return {
                    title: `⚠️ Permanently delete ${count} folders?`,
                    subtitle: "This will PERMANENTLY delete ALL their contents (notes, files, subfolders). This action CANNOT be undone."
                };
            } else {
                // Single folder with optional name and child count
                if (entityName && childCount > 0) {
                    return {
                        title: `⚠️ Permanently delete "${entityName}"?`,
                        subtitle: `This will PERMANENTLY delete this folder and ${childCount} child folder(s) with ALL their contents. This action CANNOT be undone.`
                    };
                } else if (entityName) {
                    return {
                        title: `⚠️ Permanently delete "${entityName}"?`,
                        subtitle: "This will PERMANENTLY delete ALL contents. This action CANNOT be undone."
                    };
                } else {
                    return {
                        title: "⚠️ Permanently delete this folder?",
                        subtitle: "This action CANNOT be undone. All folder content will be LOST FOREVER."
                    };
                }
            }
        }
    }
};
