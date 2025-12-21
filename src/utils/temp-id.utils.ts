/**
 * Temporary ID Generator for Unsaved Items
 * 
 * Generates sequential negative IDs for new unsaved items (workspaces, notes, folders, etc.)
 * Pattern: -1, -2, -3, ... (decreasing)
 * Names: Unsaved-1, Unsaved-2, Unsaved-3, ...
 */

import type { BaseTab } from '@/types/editor/tab.types';
import type { Note } from '@/types/note.types';
import type { Ws } from '@/store/ws/useWsList.store';

/**
 * Collect all IDs from open tabs
 * Extracts id from data field of all tab types
 */
export const collectIdsFromTabs = (openTabs: BaseTab[]): number[] => {
    const ids: number[] = [];
    
    openTabs.forEach(tab => {
        if (tab.type === 'note') {
            const noteData = tab.data as Note;
            ids.push(noteData.id);
        } else if (tab.type === 'workspace') {
            const wsData = tab.data as Ws;
            ids.push(wsData.id);
        }
        // Add other types as needed
    });
    
    return ids;
};

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
    const negativeIds = existingIds.filter(id => id < 0);
    
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
export const generateUnsavedName = (tempId: number, prefix: string = 'Unsaved'): string => {
    const sequence = Math.abs(tempId);
    return `${prefix}-${sequence}`;
};
