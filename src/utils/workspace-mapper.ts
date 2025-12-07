/**
 * Workspace Mapper - Transform backend response to frontend types
 *
 * Backend uses: itemId, itemType ('tag'/'note'/'file'), childId
 * Frontend uses: id, type ('folder'/'note'/'file')
 *
 * This mapper bridges the gap between backend and frontend type systems
 */

import {
    WorkspaceItem,
    FolderItem,
    NoteItem,
    FileItem,
    FolderMetadata,
    NoteMetadata,
    FileMetadata,
} from '@/types/workspace.types';

/**
 * Backend WorkspaceItem response format
 * This matches the structure from backend API
 */
export interface BackendWorkspaceItem {
    itemType: 'tag' | 'note' | 'file';  // Backend uses 'tag' for folders
    itemId: number;                      // Workspace item ID
    childId: number;                     // Actual entity ID (TagId/NoteId/FileId)
    userId: number;
    name: string;
    parentId?: number | null;
    slug?: string;
    color?: string;
    icon?: string;
    accessType: string;
    isOriginal: boolean;
    level: number;
    position: number;
    sortOrder: number;
    depth: number;
    metadata?: any;
    children: BackendWorkspaceItem[];
    isExpanded: boolean;
    isSelected: boolean;
    createdAt: string;
    updatedAt?: string;
}

/**
 * Transform backend WorkspaceItem to frontend FolderItem
 */
function transformToFolderItem(item: BackendWorkspaceItem): FolderItem {
    return {
        id: item.childId,                    // ✅ folder ID
        type: 'folder',                      // ✅ type = 'folder'
        itemId: item.itemId,                 // Workspace relationship ID
        userId: item.userId,
        name: item.name,
        parentId: item.parentId,
        slug: item.slug,
        color: item.color,
        icon: item.icon,
        accessType: item.accessType as 'owner' | 'shared',
        isOriginal: item.isOriginal,
        level: item.level,
        depth: item.depth,
        position: item.position,
        sortOrder: item.sortOrder,
        isExpanded: item.isExpanded,
        isSelected: item.isSelected,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: item.metadata as FolderMetadata | undefined,
        children: item.children.map(transformBackendItem),  // Recursive transform
    };
}

/**
 * Transform backend WorkspaceItem to frontend NoteItem
 */
function transformToNoteItem(item: BackendWorkspaceItem): NoteItem {
    return {
        id: item.childId,                    // ✅ note ID
        type: 'note',                        // ✅ type = 'note'
        itemId: item.itemId,                 // Workspace relationship ID
        userId: item.userId,
        name: item.name,
        parentId: item.parentId,
        slug: item.slug,
        color: item.color,
        icon: item.icon,
        accessType: item.accessType as 'owner' | 'shared',
        isOriginal: item.isOriginal,
        level: item.level,
        depth: item.depth,
        position: item.position,
        sortOrder: item.sortOrder,
        isExpanded: item.isExpanded,
        isSelected: item.isSelected,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: item.metadata as NoteMetadata | undefined,
        children: [],  // Notes cannot have children
    };
}

/**
 * Transform backend WorkspaceItem to frontend FileItem
 */
function transformToFileItem(item: BackendWorkspaceItem): FileItem {
    return {
        id: item.childId,                    // ✅ file ID
        type: 'file',                        // ✅ type = 'file'
        itemId: item.itemId,                 // Workspace relationship ID
        userId: item.userId,
        name: item.name,
        parentId: item.parentId,
        slug: item.slug,
        color: item.color,
        icon: item.icon,
        accessType: item.accessType as 'owner' | 'shared',
        isOriginal: item.isOriginal,
        level: item.level,
        depth: item.depth,
        position: item.position,
        sortOrder: item.sortOrder,
        isExpanded: item.isExpanded,
        isSelected: item.isSelected,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: item.metadata as FileMetadata | undefined,
        children: [],  // Files cannot have children
    };
}

/**
 * Main transformer - transforms backend item to appropriate frontend type
 */
export function transformBackendItem(item: BackendWorkspaceItem): WorkspaceItem {
    const itemType = item.itemType.toLowerCase();

    switch (itemType) {
        case 'tag':
        case 'folder':
            return transformToFolderItem(item);

        case 'note':
            return transformToNoteItem(item);

        case 'file':
            return transformToFileItem(item);

        default:
            console.warn(`Unknown itemType: ${item.itemType}, treating as folder`);
            return transformToFolderItem(item);
    }
}

/**
 * Transform array of backend items to frontend items
 */
export function transformBackendItems(items: BackendWorkspaceItem[]): WorkspaceItem[] {
    return items.map(transformBackendItem);
}

/**
 * Reverse transform - frontend to backend (for API requests)
 * Used when sending data back to backend
 */
export function transformToBackendItem(item: WorkspaceItem): Partial<BackendWorkspaceItem> {
    return {
        itemType: item.type === 'folder' ? 'tag' : item.type,
        childId: item.id,
        userId: item.userId,
        name: item.name,
        parentId: item.parentId,
        slug: item.slug,
        color: item.color,
        icon: item.icon,
        accessType: item.accessType,
        isOriginal: item.isOriginal,
        level: item.level,
        depth: item.depth,
        position: item.position,
        sortOrder: item.sortOrder,
        isExpanded: item.isExpanded,
        isSelected: item.isSelected,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: item.metadata,
        children: 'children' in item ? item?.children?.map(transformToBackendItem) as BackendWorkspaceItem[] : [],
    };
}
