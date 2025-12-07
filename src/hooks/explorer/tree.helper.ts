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

export interface TreeFolder {
    id: string;
    name: string;
    children?: TreeFolder[];
    data: Folder; // Store original folder data
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
        id: item.id,          // ✅ Folder ID (from FolderItem.id)
        itemId: item.itemId,  // Workspace relationship ID (for delete operations)
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
            id: folder.itemId?.toString() || folder.id.toString(),
            name: folder.name || "Untitled",
            data: folder,
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
            id: item.id,              // ✅ Folder ID (from FolderItem.id)
            itemId: item.itemId,      // Workspace relationship ID (for delete operations)
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
    data: { workspaceId: number; name: string; description?: string; color?: string; createdAt: string; isArchived: boolean; items: any[] } | null | undefined,
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
    // Backend: {itemId, itemType: 'tag'/'note'/'file', childId}
    // Frontend: {id, type: 'folder'/'note'/'file'}
    // ================================================================
    console.log('🔍 transformToTreeData - Raw backend items:', JSON.stringify(data.items, null, 2));
    console.log('🔍 transformToTreeData - Backend items breakdown:', data.items.map((item: any) => ({
        name: item.name,
        itemType: item.itemType,
        itemId: item.itemId,
        childId: item.childId,
        parentId: item.parentId
    })));

    const frontendItems = transformBackendItems(data.items as BackendWorkspaceItem[]);
    console.log('✅ transformToTreeData - Transformed to frontend types:', frontendItems.map(item => ({
        name: item.name,
        type: item.type,
        id: item.id,
        itemId: item.itemId,
        parentId: item.parentId
    })));

    // ================================================================
    // STEP 3: Build hierarchical structure from flat list
    // ✅ API returns FLAT array with parentId relationships
    // We build the tree structure here in frontend for flexibility & caching benefits
    // ================================================================
    const hierarchicalItems = buildHierarchy(frontendItems);
    console.log('🏗️ transformToTreeData - Built hierarchy:', hierarchicalItems);
    
    // ================================================================
    // STEP 4: Transform workspace items to Folder format (backward compatibility)
    // Only extracts folders - notes and files are filtered out
    // TODO: In future, support rendering notes & files in tree
    // ================================================================
    const folders: Folder[] = hierarchicalItems
        .map(transformItem)
        .filter((folder): folder is Folder => folder !== null);

    console.log('📁 transformToTreeData - Transformed folders:', folders);


    // ================================================================
    // STEP 5: Apply search filter to folder tree
    // Filter recursively - include folders that match OR have matching descendants
    // ================================================================
    const filteredFolders = folders.length > 0 ? filterTreeBySearch(folders, searchText) : [];
    console.log('🔎 transformToTreeData - Filtered folders:', filteredFolders);

    // ================================================================
    // STEP 6: Create workspace root node (workspace mode only)
    // Wrap all folders under a virtual workspace root for display
    // Always create workspace root, even if there are no child folders
    // ================================================================
    let foldersToTransform: Folder[];

    if (data && 'workspaceId' in data) {
        const workspaceRootFolder = createWorkspaceRootFolder(
            data.workspaceId,
            data.name,
            {
                description: data.description,
                color: data.color,
                createdAt: data.createdAt,
                isArchived: data.isArchived,
            },
            filteredFolders
        );
        foldersToTransform = [workspaceRootFolder];
    } else {
        foldersToTransform = filteredFolders;
    }

    // ================================================================
    // STEP 7: Convert to TreeFolder format for react-arborist
    // Transform Folder hierarchy to TreeFolder with required structure
    // ================================================================
    const result = transformFoldersToTreeData(foldersToTransform);
    console.log('🌲 transformToTreeData - Final result:', result);
    return result;
}
