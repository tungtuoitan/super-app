import { WorkspaceItem, FolderItem, NoteItem, FileItem, isFolder, canHaveChildren } from "../types/workspace.types";
import { WorkspaceItemV2, WorkspaceFolderItem, isFolder as isFolderV2, canHaveChildren as canHaveChildrenV2 } from "@/types/workspace-v2.types";
import { Folder } from "@/types/index";
import { transformBackendItems, BackendWorkspaceItem } from "../utils/workspace-mapper";
import { constants } from "@/utils/constants";
import {featureFlags} from "@/utils/config/features.config";
import type { WorkspaceDTO } from "../types/workspace-dto.types";

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
 * Recursive filter TreeFolder by search text (V2 structure)
 * Includes node if it matches OR any descendant matches
 * Shows matching nodes WITH all their ancestors (parent, grandparent, etc.)
 *
 * Search modes (configured in constants.workspace.search.mode):
 * - "showAllDescendants": When node X matches → show X + ALL children/grandchildren
 * - "exactMatchOnly": When node X matches → show only X (hide children unless they also match)
 *
 * @param nodes - TreeFolder array to filter
 * @param searchText - Search text to match against node names
 * @returns Filtered tree with matching nodes and their ancestors
 */
export function $filterTreeBySearchV2(nodes: TreeFolder[], searchText: string): TreeFolder[] {
    if (!searchText || !searchText.trim()) return nodes;

    const query = searchText.toLowerCase().trim();
    const searchMode = constants.workspace.search.mode;
    const results: TreeFolder[] = [];

    for (const node of nodes) {
        // Check if current node matches search
        const matchesSearch = node.name?.toLowerCase().includes(query);

        // Recursively filter children
        const filteredChildren = node.children && node.children.length > 0
            ? $filterTreeBySearchV2(node.children, searchText)
            : [];

        const hasMatchingDescendant = filteredChildren.length > 0;

        // Include node if:
        // 1. Node itself matches search, OR
        // 2. Any descendant matches (to show ancestors)
        if (matchesSearch || hasMatchingDescendant) {
            // Determine which children to include based on search mode
            let childrenToInclude: TreeFolder[];

            if (matchesSearch) {
                // Current node matches search
                if (searchMode === "showAllDescendants") {
                    // Mode 1: Show ALL children/grandchildren (original tree structure)
                    childrenToInclude = node.children || [];
                } else {
                    // Mode 2: Only show children that also match search
                    childrenToInclude = filteredChildren;
                }
            } else {
                // Current node doesn't match, but descendant does
                // Always show filtered children (to maintain path to matching nodes)
                childrenToInclude = filteredChildren;
            }

            results.push({
                ...node,
                children: childrenToInclude,
            });
        }
    }

    return results;
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
 * Get all visible item IDs from tree (in display order)
 * Returns workspace_items.id (NOT entityId) for proper selection
 * Does depth-first traversal to match UI display order
 */
export function getAllVisibleFolderIds(treeData: TreeFolder[]): number[] {
    return $traverse(treeData).map((node) => (node.data as any).id);
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

function $sortChildrenRecursively(nodes: TreeFolder[]) {
    nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
            sortTreeNodes(node.children);
            $sortChildrenRecursively(node.children);
        }
    });
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
 * Sort tree nodes: folders first, then other items (notes, files)
 * When same type, sort alphabetically by name (A-Z, 1-9)
 * entityType: 2 = folder, 3 = note, 4 = file
 */
function sortTreeNodes(nodes: TreeFolder[]): TreeFolder[] {
    return nodes.sort((a, b) => {
        const aItem = a.data as any;
        const bItem = b.data as any;
        
        // Get entity types (2 = folder, 3 = note, 4 = file)
        const aType = aItem.entityType || 0;
        const bType = bItem.entityType || 0;
        
        // Folders (type 2) come first
        if (aType === 2 && bType !== 2) return -1;
        if (aType !== 2 && bType === 2) return 1;
        
        // If same type, sort alphabetically by name (A-Z, 1-9)
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        return aName.localeCompare(bName, undefined, { numeric: true });
    });
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
 * 3. Sort children: folders first, then other items
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

    // -------------------------------------------------------
    // STEP 3: SORT ALL LEVELS (folders first, then others)
    // -------------------------------------------------------
    // Sort root level
    sortTreeNodes(rootNodes);
    
    // Sort all children recursively
    $sortChildrenRecursively(rootNodes);

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
 * ⚠️ PERFORMANCE NOTE - FRONTEND FILTERING:
 * Backend returns ALL workspace items (no server filtering).
 * This function currently filters by search text only.
 *
 * TODO (Future enhancement): Add optional filters for:
 * - deletedAt (show/hide deleted items)
 * - statusCode (filter notes/files by draft/published)
 * User preferences can be passed as additional parameters and stored in user profile.
 *
 * @param data - WorkspaceDTO with workspace data + flatData (or null/undefined)
 * @param searchText - Search filter text (filters by name)
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
    let treeRoots = buildTreeFromV2Items(v2Items);

    // Filter by search text if provided
    if (searchText && searchText.trim()) {
        treeRoots = $filterTreeBySearchV2(treeRoots, searchText);
    }

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
                slug: undefined,
            },
            isExpanded: true,
            isSelected: false,
        } as any, // WorkspaceFolderItem
        children: treeRoots,
    };
    return [workspaceRootV2];
};

/**
 * Find the path (ancestor IDs) from root to target item
 * Returns array of workspace_items.id from root to target (includes target)
 *
 * Example: If tree is A > B > C > D and target is D
 * Returns: [A_id, B_id, C_id, D_id]
 *
 * @param treeData - Tree structure
 * @param targetId - workspace_items.id of target item
 * @returns Array of workspace_items.id from root to target (or empty if not found)
 */
export function findPathToItem(treeData: TreeFolder[], targetId: number): number[] {
    function $findPath(nodes: TreeFolder[], path: number[]): number[] | null {
        for (const node of nodes) {
            const currentId = (node.data as any).id;
            const currentPath = [...path, currentId];

            // Found target
            if (currentId === targetId) {
                return currentPath;
            }

            // Search in children
            if (node.children && node.children.length > 0) {
                const foundPath = $findPath(node.children, currentPath);
                if (foundPath) {
                    return foundPath;
                }
            }
        }
        return null;
    }

    return $findPath(treeData, []) || [];
}

/**
 * Expand only the path to target item (collapse everything else)
 *
 * Algorithm:
 * 1. Open nodes sequentially from root to target (waiting for each to render)
 * 2. After path is fully expanded, collapse sibling branches not in path
 * 3. Scroll to target item to ensure it's visible
 *
 * Example: Tree is workspace A / folder B / folder C / note D
 * Navigate to D: Opens A, B, C, D → see A's children (B), B's children (C), C's children (D)
 * Navigate to B: Opens A, B → see A's children (B), B's children, but B's children remain closed
 * Navigate to workspace root A: Opens A → see A's children, but A's children remain closed
 *
 * Result: Only see direct children of target, not grandchildren
 *
 * @param treeRef - React-arborist tree ref
 * @param treeData - Tree structure
 * @param targetId - workspace_items.id of target item
 * @returns Promise that resolves to true when expansion is complete
 */
export async function expandPathToItem(
    treeRef: React.RefObject<any>,
    treeData: TreeFolder[],
    targetId: number
): Promise<boolean> {
    if (!treeRef.current) return false;

    // Find path to target (includes target itself)
    const pathIds = findPathToItem(treeData, targetId);
    // console.log('[expandPathToItem] pathIds:', pathIds, 'targetId:', targetId);
    if (pathIds.length === 0) return false;

    // Convert to Set for O(1) lookup
    const pathIdSet = new Set(pathIds);

    // Helper: wait for DOM update with timeout (more reliable than requestAnimationFrame for virtualized lists)
    const waitForRender = (ms: number = 50) => new Promise<void>(resolve => {
        setTimeout(resolve, ms);
    });

    // Step 1: Open nodes sequentially from root to target
    // Must wait for each level to render before opening next level
    // For virtualized trees, we need longer waits and more retries for deep nesting
    for (let i = 0; i < pathIds.length; i++) {
        const id = pathIds[i];
        const depth = i; // Current depth in tree

        // Try to get node with retry (virtualized nodes may need time to mount)
        // Increase retries for deeper nodes since they depend on parents being fully rendered
        let node = treeRef.current.get(id.toString());
        let retries = 0;
        const maxRetries = 10 + depth * 2; // More retries for deeper nodes
        const retryDelay = 50 + depth * 10; // Longer delays for deeper nodes

        while (!node && retries < maxRetries) {
            // console.log(`[expandPathToItem] Node ${id} at depth ${depth} not found, retry ${retries + 1}/${maxRetries}`);
            await waitForRender(retryDelay);
            node = treeRef.current.get(id.toString());
            retries++;
        }

        if (node) {
            // console.log(`[expandPathToItem] Opening node ${id} at depth ${depth}, isOpen: ${node.isOpen}`);
            if (!node.isOpen) {
                node.open();
                // Wait longer for children to render - virtualized lists need more time
                // Increase wait time for deeper nodes
                const openDelay = 80 + depth * 20;
                await waitForRender(openDelay);
            }

            // Scroll to current node to ensure children will be in viewport for virtualization
            // This is crucial for deep nesting - children won't render if parent is out of view
            try {
                treeRef.current.scrollTo(id.toString());
                await waitForRender(30); // Small wait after scroll
            } catch (e) {
                // scrollTo might not be available in all versions, ignore error
            }
        } else {
            console.warn(`[expandPathToItem] Failed to find node ${id} at depth ${depth} after ${maxRetries} retries`);
            // Don't return false here - continue trying to open remaining nodes
            // Some intermediate nodes might be found even if one is missing
        }
    }

    // Final wait to ensure all DOM updates are complete
    await waitForRender(100);

    // Step 2: Close sibling branches that are not in the path
    // Now all path nodes are rendered, we can traverse and close others
    const closeNonPathNodes = (nodes: TreeFolder[]) => {
        for (const treeNode of nodes) {
            const nodeId = (treeNode.data as any).id;
            const node = treeRef.current.get(nodeId.toString());

            if (!node) continue;

            if (pathIdSet.has(nodeId)) {
                // This node is in path - recursively check its children
                if (treeNode.children && treeNode.children.length > 0) {
                    closeNonPathNodes(treeNode.children);
                }
            } else {
                // This node is NOT in path - close it if open
                if (node.isOpen) {
                    node.close();
                }
            }
        }
    };

    closeNonPathNodes(treeData);

    // Final scroll to target to ensure it's visible
    try {
        treeRef.current.scrollTo(targetId.toString());
    } catch (e) {
        // Ignore scroll errors
    }

    return true;
}

export const treeMiniHelper = {
    $traverse,
    $checkSubtree,
    $findFolderById,
    $filterTreeBySearch,
    $filterTreeBySearchV2,
    $transformItemToFolder,
    isDescendant,
    getAllVisibleFolderIds,
    transformItemsToTreeData,
    createWorkspaceRootFolder,
    transformToTreeData,
    filterTopLevelParents,
    findPathToItem,
    expandPathToItem
};
