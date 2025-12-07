/**
 * Workspace Mapper - Transform backend response to frontend types
 *
 * Backend uses: id, type ('folder'/'note'/'file'), relationshipId
 * Frontend uses: id, type ('folder'/'note'/'file'), relationshipId
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
    relationshipId?: number;             // Workspace relationship ID (workspace_items.id)
    type: 'tag' | 'note' | 'file' | 'folder';  // Backend uses 'folder' or 'note' or 'file'
    id: number;                          // Entity ID (folder/note/file ID)
    childId?: number;                    // Legacy field (some APIs still use this)
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
        relationshipId: item.relationshipId, // Workspace relationship ID (workspace_items.id)
        id: item.id || item.childId!,        // ✅ folder ID (prefer 'id', fallback 'childId')
        type: 'folder',                      // ✅ type = 'folder'
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
        relationshipId: item.relationshipId, // Workspace relationship ID (workspace_items.id)
        id: item.id || item.childId!,        // ✅ note ID (prefer 'id', fallback 'childId')
        type: 'note',                        // ✅ type = 'note'
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
        relationshipId: item.relationshipId, // Workspace relationship ID (workspace_items.id)
        id: item.id || item.childId!,        // ✅ file ID (prefer 'id', fallback 'childId')
        type: 'file',                        // ✅ type = 'file'
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
    const itemType = item.type?.toLowerCase();

    // Debug log
    console.log('🔄 transformBackendItem:', {
        name: item.name,
        type: item.type,
        itemTypeLower: itemType,
        id: item.id,
        relationshipId: item.relationshipId
    });

    switch (itemType) {
        case 'tag':
        case 'folder':
            return transformToFolderItem(item);

        case 'note':
            return transformToNoteItem(item);

        case 'file':
            return transformToFileItem(item);

        default:
            console.warn(`Unknown type: ${item.type}, treating as folder`);
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
        type: item.type === 'folder' ? 'tag' : item.type,
        id: item.id,
        childId: item.id,  // Legacy field for backward compatibility
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
