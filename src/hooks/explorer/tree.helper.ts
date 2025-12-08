import { WorkspaceItem, FolderItem, NoteItem, FileItem, isFolder, canHaveChildren } from "@/types/workspace.types";
import { Folder } from "../../types";
import { transformBackendItems, BackendWorkspaceItem } from "@/utils/workspace-mapper";

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
    data: WorkspaceItem;  // Can be FolderItem | NoteItem | FileItem
    children: TreeNode[];
}

export function getAllFoldersFlattened(treeData: TreeFolder[]): TreeFolder[] {
    const result: TreeFolder[] = [];

    function traverse(nodes: TreeFolder[]) {
        for (const node of nodes) {
            result.push(node);
            if (node.children && node.children.length > 0) {
                traverse(node.children);
            }
        }
    }

    traverse(treeData);
    return result;
}

export function isDescendant(
    targetId: number,
    potentialParentId: number,
    treeData: TreeFolder[]
): boolean {
    // Find the potential parent node
    const parentNode = getAllFoldersFlattened(treeData).find(
        (t) => t.data.id === potentialParentId
    );

    if (!parentNode) return false;

    // Recursively check if targetId exists in the subtree of parentNode
    function checkSubtree(node: TreeFolder): boolean {
        if (node.data.id === targetId) {
            return true; // Found targetId in descendants
        }

        if (node.children && node.children.length > 0) {
            return node.children.some((child) => checkSubtree(child));
        }

        return false;
    }

    return checkSubtree(parentNode);
}

export function findFolderById(
    folders: Folder[],
    targetId: number
): Folder | undefined {
    for (const folder of folders) {
        if (folder.id === targetId) {
            return folder;
        }
        if (folder.children && folder.children.length > 0) {
            const found = findFolderById(folder.children, targetId);
            if (found) return found;
        }
    }
    return undefined;
}

// ✅ Updated to support all item types (folder/note/file)
export interface TreeFolder {
    id: string;
    name: string;
    children?: TreeFolder[];
    data: WorkspaceItem; // Can be FolderItem | NoteItem | FileItem
}

export function getAllVisibleFolderIds(treeData: TreeFolder[]): number[] {
    const result: number[] = [];

    function traverse(nodes: TreeFolder[]) {
        for (const node of nodes) {
            result.push(node.data.id);
            if (node.children && node.children.length > 0) {
                traverse(node.children);
            }
        }
    }

    traverse(treeData);
    return result;
}

/**
 * Flatten tree data for lookup
 */

/**
 * Transform WorkspaceItem to Folder
 * Only transforms FolderItem - notes and files return null
 * ✅ Updated to use new type system
 */
export function transformTreeItemToFolder(
    item: WorkspaceItem
): Folder | null {
    // Only transform folder items
    if (!isFolder(item)) {
        return null;
    }

    const folder: Folder = {
        id: item.id,                      // ✅ Folder ID (from FolderItem.id)
        name: item.name,
        color: item.color,
        createdAt: new Date(item.createdAt),
        isActive: true,
        depth: item.level,
        isExpanded: item.isExpanded,
        children: item.children
            .map(transformTreeItemToFolder)
            .filter((child): child is Folder => child !== null),
    };

    return folder;
}

/**
 * Transform WorkspaceItem hierarchy to react-arborist tree data
 * ✅ Supports all item types: folders (can have children), notes & files (leaf nodes)
 * NOTE: Only folders can have children - notes/files are always leaf nodes
 */
export function transformItemsToTreeData(items: WorkspaceItem[]): TreeFolder[] {
    return items
        .filter(
            (item) =>
                item && item.id !== undefined && item.id !== null
        )
        .map((item) => ({
            id: item.id.toString(),
            name: item.name || "Untitled",
            data: item,
            // Only folders can have children - notes/files are always leaf nodes
            children: isFolder(item) && item.children && item.children.length > 0
                ? transformItemsToTreeData(item.children)
                : [],
        }));
}

/**
 * @deprecated Use transformItemsToTreeData instead
 * Transform folder hierarchy to react-arborist tree data
 * NOTE: All nodes must have children array (even if empty) to allow drop into them
 */
export function transformFoldersToTreeData(folders: Folder[]): TreeFolder[] {
    return folders
        .filter(
            (folder) =>
                folder && folder.id !== undefined && folder.id !== null
        )
        .map((folder) => ({
            id: folder.id.toString(),
            name: folder.name || "Untitled",
            data: folder as any, // Cast for backward compatibility
            // Always provide children array (empty if no children) to enable drop into nodes
            children:
                folder.children && folder.children.length > 0
                    ? transformFoldersToTreeData(folder.children)
                    : [],
        }));
}

/**
 * Filter folder tree based on search text
 * Includes folder if it matches OR any descendant matches
 */
export function filterTreeBySearch(
    nodes: Folder[],
    searchText: string
): Folder[] {
    if (!searchText) return nodes;

    return nodes
        .filter((folder) => {
            const matchesSearch = folder.name
                .toLowerCase()
                .includes(searchText.toLowerCase());

            // Include if this folder matches OR any descendant matches
            const hasMatchingDescendant =
                folder.children && folder.children.length > 0
                    ? filterTreeBySearch(folder.children, searchText).length > 0
                    : false;

            return matchesSearch || hasMatchingDescendant;
        })
        .map((folder) => ({
            ...folder,
            children:
                folder.children && folder.children.length > 0
                    ? filterTreeBySearch(folder.children, searchText)
                    : [],
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
    children: Folder[]
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
     * Build hierarchical structure from flat list using parentId
     * ✅ Supports all item types: folders (can have children), notes & files (leaf nodes)
     * Backend returns flat array with parentId, we build hierarchy here
     * Benefits: smaller payload, better caching, easier updates
     */
    function buildHierarchy(items: WorkspaceItem[]): WorkspaceItem[] {
        console.log('🏗️ buildHierarchy - Input items:', items.map(i => ({
            name: i.name,
            id: i.id,
            type: i.type,
            parentId: i.parentId
        })));

        // Create a map for O(1) lookup - include ALL item types
        const itemMap = new Map<number, WorkspaceItem>();

        items.forEach(item => {
            // Only folders can have children
            const itemWithChildren: WorkspaceItem = isFolder(item)
                ? { ...item, children: [] }
                : { ...item, children: [] as any };  // Notes/files will keep empty children

            itemMap.set(item.id, itemWithChildren);
        });

        console.log('🗺️ buildHierarchy - Item map keys:', Array.from(itemMap.keys()));

        // Build parent-child relationships
        const roots: WorkspaceItem[] = [];

        items.forEach(item => {
            const currentItem = itemMap.get(item.id);
            if (!currentItem) return;

            if (item.parentId === null || item.parentId === undefined) {
                // Root level item (no parent)
                console.log(`✅ Root item: ${item.name} (id: ${item.id})`);
                roots.push(currentItem);
            } else {
                // Child item - add to parent's children array
                const parent = itemMap.get(item.parentId);
                if (parent) {
                    // Only add to parent if parent is a folder
                    if (isFolder(parent)) {
                        console.log(`✅ Adding ${item.name} (id: ${item.id}) to parent ${parent.name} (id: ${parent.id})`);
                        parent.children.push(currentItem);
                    } else {
                        console.warn(`⚠️ Item ${item.id} has parent ${item.parentId} which is not a folder`);
                        roots.push(currentItem);
                    }
                } else {
                    // Orphan (parent not found) - treat as root
                    console.warn(`⚠️ Orphan: ${item.name} (id: ${item.id}) has parentId ${item.parentId} but parent not found in map`);
                    roots.push(currentItem);
                }
            }
        });

        console.log('📦 buildHierarchy - Roots:', roots.map(r => ({ name: r.name, id: r.id, childrenCount: isFolder(r) ? r.children.length : 0 })));

        return roots;
    }

    /**
     * Transform WorkspaceItem to Folder (for backward compatibility)
     * Only transforms FolderItem - notes and files return null
     */
    function transformItem(item: WorkspaceItem): Folder | null {
        // Only transform folder items
        if (!isFolder(item)) {
            return null;
        }

        return {
            id: item.id,                      // ✅ Folder ID (from FolderItem.id)
            name: item.name,
            color: item.color,
            createdAt: new Date(item.createdAt),
            isActive: true,
            depth: item.level,
            isExpanded: item.isExpanded,
            children: item.children
                .map(transformItem)
                .filter((child): child is Folder => child !== null),
        };
    }

/**
 * Transform workspace data to react-arborist tree data
 * Handles all transformation logic in a single function:
 * 1. Transform backend response to frontend types
 * 2. Extract folders from workspace items
 * 3. Filter by search text
 * 4. Wrap in workspace root (if workspace mode)
 * 5. Convert to TreeFolder format
 *
 * @param data - Workspace data with tree items (or null/undefined)
 * @param searchText - Search filter text
 * @returns TreeFolder array ready for react-arborist
 */
export function transformToTreeData(
    data: { workspaceId: number; name: string; description?: string; color?: string; createdAt: string; isArchived: boolean; items: any[], userId: number, updatedAt?: string, icon?: string } | null | undefined,
    searchText: string
): TreeFolder[] {
    // ================================================================
    // STEP 1: Validate input data
    // ================================================================
    if (!data || !('items' in data)) {
        return [];
    }

    // ================================================================
    // STEP 2: Transform backend response to frontend types
    // Backend: {id, type: 'folder'/'note'/'file'}
    // Frontend: {id, type: 'folder'/'note'/'file'}
    // ================================================================

    const frontendItems = transformBackendItems(data.items as BackendWorkspaceItem[]);

    // ================================================================
    // STEP 3: Build hierarchical structure from flat list
    // ✅ API returns FLAT array with parentId relationships
    // We build the tree structure here in frontend for flexibility & caching benefits
    // ================================================================
    const hierarchicalItems = buildHierarchy(frontendItems);
    console.log('🏗️ transformToTreeData - Built hierarchy:', hierarchicalItems);
    
    // ================================================================
    // STEP 4: Apply search filter (if needed)
    // TODO: Implement search filter for all item types (not just folders)
    // ================================================================
    const filteredItems = hierarchicalItems; // For now, no filtering
    console.log('🔎 transformToTreeData - Filtered items:', filteredItems);

    // ================================================================
    // STEP 5: Create workspace root node (workspace mode only)
    // Wrap all items under a virtual workspace root for display
    // ================================================================
    let itemsToTransform: WorkspaceItem[];

    if (data && 'workspaceId' in data) {
        // Create workspace root as a FolderItem
        const workspaceRoot: FolderItem = {
            id: -12345,  // Virtual ID for workspace root, -12345 is used to avoid conflicts
            type: 'folder',
            userId: data.userId,
            name: data.name,
            color: data.color,
            icon: data.icon,
            accessType: 'owner',
            isOriginal: true,
            level: 0,
            depth: 0,
            position: 0,
            sortOrder: 0,
            isExpanded: true,
            isSelected: false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            children: filteredItems,
        };
        itemsToTransform = [workspaceRoot];
    } else {
        itemsToTransform = filteredItems;
    }

    // ================================================================
    // STEP 6: Convert to TreeFolder format for react-arborist
    // ✅ Transform WorkspaceItem hierarchy (folders, notes, files) to TreeFolder
    // ================================================================
    const result = transformItemsToTreeData(itemsToTransform);
    console.log('🌲 transformToTreeData - Final result:', result);
    return result;
}
