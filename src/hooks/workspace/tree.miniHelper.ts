import { WorkspaceItem, FolderItem, NoteItem, FileItem, isFolder, canHaveChildren } from "@/types/workspace.types";
import { WorkspaceItemV2, WorkspaceFolderItem, isFolder as isFolderV2, canHaveChildren as canHaveChildrenV2 } from "@/types/workspace-v2.types";
import { Folder } from "../../types";
import { transformBackendItems, BackendWorkspaceItem } from "@/utils/workspace-mapper";
import { constants } from "@/utils/constants";
import {featureFlags} from "@/config/features.config";
import type { WorkspaceDTO } from "@/types/workspace-dto.types";

// ============================================
// RECURSIVE HELPER FUNCTIONS (prefix with $)
// ============================================

/**
 * Recursive traverse helper for tree structures
 * Generic traversal that collects items matching predicate
 */
export function $traverse<T extends { children?: T[] }>(nodes: T[], predicate: (node: T) => boolean = () => true): T[] {
    const result: T[] = [];

    function $_traverse(items: T[]) {
        for (const item of items) {
            if (predicate(item)) {
                result.push(item);
            }
            if (item.children && item.children.length > 0) {
                $_traverse(item.children);
            }
        }
    }

    $_traverse(nodes);
    return result;
}

/**
 * Recursive check if targetId exists in subtree of a node
 */
export function $checkSubtree(node: TreeFolder, targetId: number): boolean {
    if (node.data.id === targetId) {
        return true;
    }

    if (node.children && node.children.length > 0) {
        return node.children.some((child) => $checkSubtree(child, targetId));
    }

    return false;
}

/**
 * Recursive find folder by ID in nested structure
 */
export function $findFolderById(folders: Folder[], targetId: number): Folder | undefined {
    for (const folder of folders) {
        if (folder.id === targetId) {
            return folder;
        }
        if (folder.children && folder.children.length > 0) {
            const found = $findFolderById(folder.children, targetId);
            if (found) return found;
        }
    }
    return undefined;
}

/**
 * Recursive filter tree by search text
 * Includes node if it matches OR any descendant matches
 */
export function $filterTreeBySearch(nodes: Folder[], searchText: string): Folder[] {
    if (!searchText) return nodes;

    return nodes
        .filter((folder) => {
            const matchesSearch = folder.name.toLowerCase().includes(searchText.toLowerCase());

            const hasMatchingDescendant =
                folder.children && folder.children.length > 0
                    ? $filterTreeBySearch(folder.children, searchText).length > 0
                    : false;

            return matchesSearch || hasMatchingDescendant;
        })
        .map((folder) => ({
            ...folder,
            children:
                folder.children && folder.children.length > 0 ? $filterTreeBySearch(folder.children, searchText) : [],
        }));
}

/**
 * Recursive transform WorkspaceItem to Folder
 * Only transforms FolderItem - notes and files return null
 */
export function $transformItemToFolder(item: WorkspaceItem): Folder | null {
    if (!isFolder(item)) {
        return null;
    }

    return {
        id: item.id,
        name: item.name,
        color: item.color,
        createdAt: new Date(item.createdAt),
        isActive: true,
        depth: item.level,
        isExpanded: item.isExpanded,
        children: item.children.map($transformItemToFolder).filter((child): child is Folder => child !== null),
    };
}

// ============================================
// TREE NODE TYPES (for react-arborist)
// ============================================

/**
 * Tree node wrapper for react-arborist
 * Can wrap any WorkspaceItem (folder, note, or file)
 */
export interface TreeNode {
    id: string;
    name: string;
    data: WorkspaceItem; // Can be FolderItem | NoteItem | FileItem
    children: TreeNode[];
}

export function isDescendant(targetId: number, potentialParentId: number, treeData: TreeFolder[]): boolean {
    // Find the potential parent node
    const parentNode = $traverse(treeData).find((t) => t.data.id === potentialParentId);

    if (!parentNode) return false;

    // Recursively check if targetId exists in the subtree of parentNode
    return $checkSubtree(parentNode, targetId);
}

/**
 * Filter selected folder IDs to only include top-level parents
 * Removes any descendant folders to prevent duplicate processing
 *
 * Example:
 *   Input: [5, 12, 13, 20] where 12→13 are descendants of 5
 *   Output: [5, 20] (12 and 13 excluded as they're under 5)
 *
 * @param selectedIds - Array of selected folder IDs
 * @param treeData - Tree data structure
 * @returns Filtered array containing only top-level parent IDs
 */
export function filterTopLevelParents(
    selectedIds: number[],
    treeData: TreeFolder[]
): number[] {
    // If only one or zero selected, return as-is
    if (selectedIds.length <= 1) {
        return selectedIds;
    }

    const topLevel: number[] = [];

    for (const id of selectedIds) {
        // Check if this ID is a descendant of any other selected ID
        const isDescendantOfOther = selectedIds
            .filter(otherId => otherId !== id)
            .some(parentId => isDescendant(id, parentId, treeData));

        // If not a descendant of any other, it's a top-level parent
        if (!isDescendantOfOther) {
            topLevel.push(id);
        }
    }

    return topLevel;
}

// ✅ Updated to support all item types (folder/note/file)
export interface TreeFolder {
    id: string;
    name: string;
    children?: TreeFolder[];
    data: WorkspaceItem; // Can be FolderItem | NoteItem | FileItem
}

/**
 * Get all visible folder entity IDs from tree
 * V2: Returns entityId (entity ID from folders/notes/files table)
 */
export function getAllVisibleFolderIds(treeData: TreeFolder[]): number[] {
    return $traverse(treeData).map((node) => (node.data as any).entityId);
}


/**
 * Flatten tree data for lookup
 */

/**
 * Transform WorkspaceItem hierarchy to react-arborist tree data
 * ✅ Supports all item types: folders (can have children), notes & files (leaf nodes)
 * NOTE: Only folders can have children - notes/files are always leaf nodes
 */
export function transformItemsToTreeData(items: WorkspaceItem[]): TreeFolder[] {
    return items
        .filter((item) => item && item.id !== undefined && item.id !== null)
        .map((item) => ({
            id: item.id.toString(),
            name: item.name || "Unsaved",
            data: item,
            // Only folders can have children - notes/files are always leaf nodes
            children: isFolder(item) && item.children && item.children.length > 0 ? transformItemsToTreeData(item.children) : [],
        }));
}

/**
 * Create workspace root folder node
 * Wraps folders under a workspace root for display
 */
export function createWorkspaceRootFolder(
    workspaceId: number,
    workspaceName: string,
    workspaceData: {
        description?: string;
        color?: string;
        createdAt: string;
        isArchived: boolean;
    },
    children: Folder[],
): Folder {
    return {
        id: -workspaceId,
        name: workspaceName,
        description: workspaceData.description,
        color: workspaceData.color,
        createdAt: new Date(workspaceData.createdAt),
        isActive: !workspaceData.isArchived,
        depth: 0,
        isArchived: workspaceData.isArchived,
        children: children,
        isExpanded: true,
    };
}

/**
 * Build hierarchical TreeFolder structure from flat V2 list
 *
 * KEY CONCEPT:
 * - WorkspaceItemV2.id = workspace_items.id (workspace item ID)
 * - WorkspaceItemV2.entityId = entity ID (folders.id | notes.id | files.id)
 * - WorkspaceItemV2.parentId = parent workspace_items.id (SELF-REFERENCING, NOT entity ID!)
 *
 * ALGORITHM:
 * 1. Create map using workspace_items.id as key for O(1) parent lookup
 * 2. Build parent-child relationships using parentId (which references parent's workspace_items.id)
 *
 * @param items - Flat list of workspace items from API
 * @returns Hierarchical tree structure (roots only - children are nested)
 */
export function buildTreeFromV2Items(items: WorkspaceItemV2[]): TreeFolder[] {
    // -------------------------------------------------------
    // STEP 1: CREATE MAP FOR O(1) LOOKUP
    // -------------------------------------------------------
    // Map key = workspace_items.id
    // Map value = TreeFolder node
    // Why workspace_items.id? Because parentId references parent's workspace_items.id (self-referencing)
    const workspaceItemIdToNodeMap = new Map<number, TreeFolder>();
    const allTreeNodes: TreeFolder[] = [];

    // Create TreeFolder node for each workspace item
    items.forEach((workspaceItem) => {
        const treeNode: TreeFolder = {
            id: workspaceItem.id.toString(), // Use workspace_items.id as string for react-arborist
            name: workspaceItem.data.name,
            data: workspaceItem as any, // Store full V2 structure
            children: [],
        };
        // Map by workspace_items.id for parent lookup
        workspaceItemIdToNodeMap.set(workspaceItem.id, treeNode);
        allTreeNodes.push(treeNode);
    });

    // -------------------------------------------------------
    // STEP 2: BUILD PARENT-CHILD RELATIONSHIPS
    // -------------------------------------------------------
    const rootNodes: TreeFolder[] = [];

    items.forEach((workspaceItem) => {
        const currentWorkspaceItemId = workspaceItem.id;
        const currentNode = workspaceItemIdToNodeMap.get(currentWorkspaceItemId);
        if (!currentNode) return;

        const parentWorkspaceItemId = workspaceItem.parentId;

        if (parentWorkspaceItemId === null || parentWorkspaceItemId === undefined) {
            // Root level item (no parent)
            rootNodes.push(currentNode);
        } else {
            // Child item - find parent by workspace_items.id
            const parentNode = workspaceItemIdToNodeMap.get(parentWorkspaceItemId);
            if (parentNode) {
                // Add to parent's children
                parentNode.children!.push(currentNode);
            } else {
                // Parent not found (orphan) - treat as root
                console.warn(`⚠️ Parent workspace_item ID ${parentWorkspaceItemId} not found for item ${workspaceItem.id}, treating as root`);
                rootNodes.push(currentNode);
            }
        }
    });

    return rootNodes;
}

/**
 * Build hierarchical structure from flat list using parentId
 * ✅ Supports all item types: folders (can have children), notes & files (leaf nodes)
 * Backend returns flat array with parentId, we build hierarchy here
 * Benefits: smaller payload, better caching, easier updates
 */
// function buildHierarchy(items: WorkspaceItem[]): WorkspaceItem[] {
//     // Create a map for O(1) lookup - include ALL item types
//     const itemMap = new Map<number, WorkspaceItem>();

//     items.forEach((item) => {
//         // Only folders can have children
//         const itemWithChildren: WorkspaceItem = isFolder(item) ? { ...item, children: [] } : { ...item, children: [] as any }; // Notes/files will keep empty children

//         itemMap.set(item.id, itemWithChildren);
//     });

//     // Build parent-child relationships
//     const roots: WorkspaceItem[] = [];

//     items.forEach((item) => {
//         const currentItem = itemMap.get(item.id);
//         if (!currentItem) return;

//         if (item.parentId === null || item.parentId === undefined) {
//             // Root level item (no parent)
//             roots.push(currentItem);
//         } else {
//             // Child item - add to parent's children array
//             const parent = itemMap.get(item.parentId);
//             if (parent) {
//                 // Only add to parent if parent is a folder
//                 if (isFolder(parent)) {
//                     parent.children.push(currentItem);
//                 } else {
//                     roots.push(currentItem);
//                 }
//             } else {
//                 // Orphan (parent not found) - treat as root
//                 roots.push(currentItem);
//             }
//         }
//     });

//     return roots;
// }


/**
 * Transform workspace data to react-arborist tree data
 * Handles all transformation logic in a single function:
 * 1. Transform backend response to frontend types
 * 2. Extract folders from workspace items
 * 3. Filter by search text
 * 4. Wrap in workspace root (if workspace mode)
 * 5. Convert to TreeFolder format
 *
 * @param data - WorkspaceDTO with workspace data + flatData (or null/undefined)
 * @param searchText - Search filter text
 * @returns TreeFolder array ready for react-arborist
 */
export function transformToTreeData(
    data: WorkspaceDTO | null | undefined,
    searchText: string,
): TreeFolder[] {
    // Validate input data
    if (!data || !data.flatData) {
        return [];
    }

    // Get flat list of workspace items
    const v2Items = data.flatData;

    // Build tree structure from flat V2 list
    const treeRoots = buildTreeFromV2Items(v2Items);

    // Create workspace root node from WorkspaceDTO
    const workspaceRootV2: TreeFolder = {
        id: `${constants.workspace.root.workspaceItemId}`,
        name: data.name,
        data: {
            // WorkspaceItemV2 structure
            id: constants.workspace.root.workspaceItemId, // workspace_items.id
            workspaceId: data.id,
            parentId: null,
            entityType: 2, // folder
            entityId: constants.workspace.root.entityId, // folders.id (entity ID)
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            deletedAt: null,
            copyInfo: null,
            level: 0,
            position: 0,
            accessType: "owner" as const,
            isOriginal: true,
            data: {
                // FolderData - entity data
                id: constants.workspace.root.entityId, // folders.id (entity ID)
                userId: data.userId,
                name: data.name,
                description: data.description,
                color: data.color,
                icon: data.icon,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                deletedAt: null,
                copyInfo: null,
                slug: undefined,
            },
            isExpanded: true,
            isSelected: false,
        } as any, // WorkspaceFolderItem
        children: treeRoots,
    };
    return [workspaceRootV2];
};

export const treeMiniHelper = {
    $traverse,
    $checkSubtree,
    $findFolderById,
    $filterTreeBySearch,
    $transformItemToFolder,
    isDescendant,
    getAllVisibleFolderIds,
    transformItemsToTreeData,
    createWorkspaceRootFolder,
    transformToTreeData,
};
