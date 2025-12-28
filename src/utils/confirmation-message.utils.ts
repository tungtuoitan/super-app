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

/**
 * Generate confirmation message based on entity type and delete type
 * 
 * @param params - Configuration for confirmation message
 * @returns Formatted confirmation message string
 */
export const getConfirmMessage = (params: GetConfirmMessageParams): string => {
    const { type, entityType, count, isMultiple, entityName, childCount = 0 } = params;

    if (type === "soft-delete") {
        // ==================== SOFT DELETE MESSAGES ====================
        if (entityType === "note" || entityType === "file") {
            // Note and file share the same messages
            if (isMultiple) {
                const label = entityType === "file" ? "files" : "notes";
                return `Are you sure you want to delete ${count} selected ${label}?`;
            } else {
                if (entityName) {
                    return `Are you sure you want to delete "${entityName}"?`;
                } else {
                    const label = entityType === "file" ? "file" : "note";
                    return `Are you sure you want to delete this ${label}?`;
                }
            }
        } else if (entityType === "workspace") {
            return isMultiple
                ? `Are you sure you want to delete ${count} selected workspaces?\n\n⚠️ This will also delete ALL folders, notes, and files in these workspaces.\n\n`
                : `Are you sure you want to delete this workspace?\n\n⚠️ This will also delete ALL folders, notes, and files in this workspace.\n\n`;
        } else {
            // folder
            if (isMultiple) {
                return `Are you sure you want to delete ${count} selected folders?`;
            } else {
                // Single folder with optional name and child count
                if (entityName && childCount > 0) {
                    return `Are you sure you want to delete "${entityName}"?`;
                } else if (entityName) {
                    return `Are you sure you want to delete "${entityName}"?`;
                } else {
                    return `Are you sure you want to delete this folder?`;
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
                return `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${count} selected ${label}.\n\n❌ This action CANNOT be undone.\n❌ All ${content} will be LOST FOREVER.`;
            } else {
                const content = entityType === "file" ? "file" : "note content";
                if (entityName) {
                    return `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${entityName}".\n\n❌ This action CANNOT be undone.\n❌ The ${content} will be LOST FOREVER.`;
                } else {
                    const label = entityType === "file" ? "file" : "note";
                    return `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete this ${label}.\n\n❌ This action CANNOT be undone.\n❌ All ${content} will be LOST FOREVER.`;
                }
            }
        } else if (entityType === "workspace") {
            return isMultiple
                ? `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${count} selected workspaces and ALL their contents (folders, notes, files).\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`
                : `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete this workspace and ALL its contents (folders, notes, files).\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`;
        } else {
            // folder
            if (isMultiple) {
                return `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete ${count} selected folders and ALL their contents (notes, files, subfolders).\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`;
            } else {
                // Single folder with optional name and child count
                if (entityName && childCount > 0) {
                    return `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${entityName}" and ${childCount} child folder(s) with ALL their contents.\n\n❌ This action CANNOT be undone.\n❌ All notes, files, and subfolders will be LOST FOREVER.`;
                } else if (entityName) {
                    return `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete "${entityName}" and ALL its contents.\n\n❌ This action CANNOT be undone.\n❌ All data will be LOST FOREVER.`;
                } else {
                    return `⚠️ HARD DELETE WARNING\n\nThis will PERMANENTLY delete this folder.\n\n❌ This action CANNOT be undone.\n❌ All folder content will be LOST FOREVER.`;
                }
            }
        }
    }
};
