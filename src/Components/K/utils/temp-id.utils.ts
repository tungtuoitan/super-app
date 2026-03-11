/**
 * Temporary ID Generator for Unsaved Items
 *
 * Generates sequential negative IDs for new unsaved items (workspaces, notes, folders, etc.)
 * Pattern: -1, -2, -3, ... (decreasing)
 * Names: Unsaved-1, Unsaved-2, Unsaved-3, ...
 */

import {KItemV2} from "../types/K-v2.types";
import {kconstants} from "./K.Constants";


/**
 * Generate unique temporary negative ID
 * Returns -1 for first unsaved item, -2 for second, etc.
 *
 * @param existingIds - Array of all existing IDs (from open tabs)
 * @returns Next sequential negative ID
 *
 * @example
 * generateTempId([1, 2, 3]) // Returns -1
 * generateTempId([1, 2, -1]) // Returns -2
 * generateTempId([1, -1, -2, -3]) // Returns -4
 */
export const generateTempId = (existingIds: number[]): number => {
    // Find all negative IDs
    const negativeIds = existingIds.filter((id) => id < 0);

    // If no negative IDs exist, start with -1
    if (negativeIds.length === 0) {
        return -1;
    }

    // Find the smallest (most negative) ID
    const minId = Math.min(...negativeIds);

    // Return next sequential negative ID
    return minId - 1;
};

/**
 * Generate sequential name for unsaved items
 * Pattern: Unsaved-1, Unsaved-2, Unsaved-3, ...
 *
 * @param tempId - Temporary negative ID (e.g., -1, -2, -3)
 * @param prefix - Prefix for the name (default: 'Unsaved')
 * @returns Formatted name
 *
 * @example
 * generateUnsavedName(-1, 'Workspace') // Returns "Workspace-1"
 * generateUnsavedName(-2, 'Note') // Returns "Note-2"
 * generateUnsavedName(-3) // Returns "Unsaved-3"
 */
export const generateUnsavedName = (tempId: number, prefix: string = "Unsaved"): string => {
    const sequence = Math.abs(tempId);
    return `${prefix}-${sequence}`;
};

export const SPECIAL_IDS = [
    kconstants.workspace.root.workspaceItemId,
    kconstants.workspace.root.entityId,
    kconstants.workspace.dropZone.workspaceItemId,
    kconstants.workspace.dropZone.entityId,
] as number[];

/**
 * Collect all IDs from workspace tree (flatData)
 * Returns separate arrays for workspace items, notes, and files
 * IMPORTANT: Filters out special IDs (root, dropZone) to prevent conflicts with temp IDs
 *
 * @param flatData - Flat array of workspace items (WorkspaceItemV2[])
 * @returns Object containing:
 *   - workspaceItemIds: All workspace_items.id (workspace item IDs)
 *   - noteEntityIds: All notes.id (entity IDs for notes)
 *   - fileEntityIds: All files.id (entity IDs for files)
 *   - folderEntityIds: All folders.id (entity IDs for folders)
 *
 * @example
 * const { workspaceItemIds, noteEntityIds, fileEntityIds } = collectIdsFromTree(flatData);
 * const tempWorkspaceItemId = generateTempId(workspaceItemIds);
 * const tempNoteId = generateTempId(noteEntityIds);
 */
export const collectIdsFromTree = (flatData: KItemV2[]): {
    workspaceItemIds: number[];
    noteEntityIds: number[];
    fileEntityIds: number[];
    folderEntityIds: number[];
} => {
    const workspaceItemIds: number[] = [];
    const noteEntityIds: number[] = [];
    const fileEntityIds: number[] = [];
    const folderEntityIds: number[] = [];

    // Special IDs to skip (root, dropZone)
    // These IDs are reserved for virtual nodes and should never be used for temp IDs


    flatData.forEach((item) => {
        // Skip special IDs (root, dropZone) to prevent conflicts
        const isSpecialId = SPECIAL_IDS.includes(item.id) || SPECIAL_IDS.includes(item.entityId);
        if (isSpecialId) {
            return;
        }

        // Collect workspace_items.id (always present)
        workspaceItemIds.push(item.id);

        // Collect entity IDs based on entity type
        if (item.entityType === 2) {
            // Folder
            folderEntityIds.push(item.entityId);
        } else if (item.entityType === 3) {
            // Note
            noteEntityIds.push(item.entityId);
        } else if (item.entityType === 4) {
            // File
            fileEntityIds.push(item.entityId);
        }
    });

    return {
        workspaceItemIds,
        noteEntityIds,
        fileEntityIds,
        folderEntityIds,
    };
};
