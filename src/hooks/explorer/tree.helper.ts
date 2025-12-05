import {WorkspaceItemResponse} from "@/types/workspace.types";
import { Folder } from "../../types";

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
 * Transform WorkspaceItemResponse to Folder
 * Only transforms items with itemType='tag' (folders)
 */
export function transformTreeItemToFolder(
    item: WorkspaceItemResponse
): Folder | null {
    // Only transform tag items (folders)
    if (item.itemType.toLowerCase() !== "tag") {
        return null;
    }

    const folder: Folder = {
        id: item.childId,
        itemId: item.itemId,
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


    function transformItem(item: WorkspaceItemResponse): Folder | null {
        // Only transform tag items (folders)
        if (item.itemType.toLowerCase() !== "folder") {
            return null;
        }

        return {
            id: item.id, // Use item.id (backend provides this)
            itemId: item.itemId,
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
 * 1. Extract folders from workspace items
 * 2. Filter by search text
 * 3. Wrap in workspace root (if workspace mode)
 * 4. Convert to TreeFolder format
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
    // STEP 2: Transform workspace items to Folder format
    // Only include 'tag' type items (folders)
    // Recursively transform all children
    // ================================================================
    console.log('🔍 transformToTreeData - Input data.items:', data.items);
    
    const folders: Folder[] = data.items
        .map(transformItem)
        .filter((folder): folder is Folder => folder !== null);
    
    console.log('📁 transformToTreeData - Transformed folders:', folders);

    // ================================================================
    // STEP 3: Apply search filter to folder tree
    // Filter recursively - include folders that match OR have matching descendants
    // ================================================================
    const filteredFolders = folders.length > 0 ? filterTreeBySearch(folders, searchText) : [];
    console.log('🔎 transformToTreeData - Filtered folders:', filteredFolders);

    // ================================================================
    // STEP 4: Create workspace root node (workspace mode only)
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
    // STEP 5: Convert to TreeFolder format for react-arborist
    // Transform Folder hierarchy to TreeFolder with required structure
    // ================================================================
    const result = transformFoldersToTreeData(foldersToTransform);
    console.log('🌲 transformToTreeData - Final result:', result);
    return result;
}
