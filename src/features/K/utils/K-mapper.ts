/**
 * Workspace Mapper - Transform backend response to frontend types
 *
 *
 * This mapper bridges the gap between backend and frontend type systems
 */

import { KWorkspaceItem, FolderItem, NoteItem, FileItem, KFolderMetadata, KNoteMetadata, KFileMetadata } from "../types/K.types";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import {kconstants} from "./K.Constants";

/**
 * Type aliases for backend API types
 */
export type BackendItemType = 
    | typeof workspaceConstants.itemTypes.note
    | typeof workspaceConstants.itemTypes.file
    | typeof workspaceConstants.itemTypes.folder;

/**
 * Backend WorkspaceItem response format
 * This matches the structure from backend API
 */
export interface BackendWorkspaceItem {
    type: BackendItemType; // Backend uses 'folder' or 'note' or 'file'
    id: number; // Entity ID (folder/note/file ID)
    childId?: number; // Legacy field (some APIs still use this)
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
        id: item.id || item.childId!, // âœ… folder ID (prefer 'id', fallback 'childId')
        type: workspaceConstants.itemTypes.folder, // âœ… type = 'folder'
        userId: item.userId,
        name: item.name,
        parentId: item.parentId,
        slug: item.slug,
        color: item.color,
        icon: item.icon,
        accessType: item.accessType as "owner" | "shared",
        isOriginal: item.isOriginal,
        level: item.level,
        depth: item.depth,
        position: item.position,
        sortOrder: item.sortOrder,
        isExpanded: item.isExpanded,
        isSelected: item.isSelected,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: item.metadata as KFolderMetadata | undefined,
        children: item.children.map(transformBackendItem), // Recursive transform
    };
}

/**
 * Transform backend WorkspaceItem to frontend NoteItem
 */
function transformToNoteItem(item: BackendWorkspaceItem): NoteItem {
    return {
        id: item.id || item.childId!, // âœ… note ID (prefer 'id', fallback 'childId')
        type: workspaceConstants.itemTypes.note, // âœ… type = 'note'
        userId: item.userId,
        name: item.name,
        parentId: item.parentId,
        slug: item.slug,
        color: item.color,
        icon: item.icon,
        accessType: item.accessType as "owner" | "shared",
        isOriginal: item.isOriginal,
        level: item.level,
        depth: item.depth,
        position: item.position,
        sortOrder: item.sortOrder,
        isExpanded: item.isExpanded,
        isSelected: item.isSelected,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: item.metadata as KNoteMetadata | undefined,
        children: [], // Notes cannot have children
    };
}

/**
 * Transform backend WorkspaceItem to frontend FileItem
 */
function transformToFileItem(item: BackendWorkspaceItem): FileItem {
    return {
        id: item.id || item.childId!, // âœ… file ID (prefer 'id', fallback 'childId')
        type: workspaceConstants.itemTypes.file, // âœ… type = 'file'
        userId: item.userId,
        name: item.name,
        parentId: item.parentId,
        slug: item.slug,
        color: item.color,
        icon: item.icon,
        accessType: item.accessType as "owner" | "shared",
        isOriginal: item.isOriginal,
        level: item.level,
        depth: item.depth,
        position: item.position,
        sortOrder: item.sortOrder,
        isExpanded: item.isExpanded,
        isSelected: item.isSelected,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        metadata: item.metadata as KFileMetadata | undefined,
        children: [], // Files cannot have children
    };
}

/**
 * Main transformer - transforms backend item to appropriate frontend type
 */
export function transformBackendItem(item: BackendWorkspaceItem): KWorkspaceItem {
    const itemType = item.type?.toLowerCase();

    switch (itemType) {
        case "tag":
        case workspaceConstants.itemTypes.folder:
            return transformToFolderItem(item);

        case workspaceConstants.itemTypes.note:
            return transformToNoteItem(item);

        case workspaceConstants.itemTypes.file:
            return transformToFileItem(item);

        default:
            console.warn(`Unknown type: ${item.type}, treating as folder`);
            return transformToFolderItem(item);
    }
}

/**
 * Transform array of backend items to frontend items
 */
export function transformBackendItems(items: BackendWorkspaceItem[]): KWorkspaceItem[] {
    return items.map(transformBackendItem);
}

/**
 * Reverse transform - frontend to backend (for API requests)
 * Used when sending data back to backend
 */
export function transformToBackendItem(item: KWorkspaceItem): Partial<BackendWorkspaceItem> {
    return {
        type: (item.type === workspaceConstants.itemTypes.folder ? "folder" : item.type) as BackendItemType,
        id: item.id,
        childId: item.id, // Legacy field for backward compatibility
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
        children: "children" in item ? (item?.children?.map(transformToBackendItem) as BackendWorkspaceItem[]) : [],
    };
}



