/**
 * Tree Helper Hook
 * Utility functions for tree data manipulation and transformations
 */

import type { Folder } from "@/types/folder.types";
import type { WorkspaceTreeItemResponse } from "@/types/workspace.types";
import { getAllFoldersFlattened } from "./tree.helper";

/**
 * Tree data structure for react-arborist
 */
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
            result.push(node.data.tagId);
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
 * Transform WorkspaceTreeItemResponse to Folder
 * Only transforms items with itemType='tag' (folders)
 */
export function transformTreeItemToFolder(
    item: WorkspaceTreeItemResponse
): Folder | null {
    // Only transform tag items (folders)
    if (item.itemType.toLowerCase() !== "tag") {
        return null;
    }

    const folder: Folder = {
        tagId: item.childId,
        folderId: item.childId,
        id: item.id,
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
                folder && folder.tagId !== undefined && folder.tagId !== null
        )
        .map((folder) => ({
            id: folder.tagId.toString(),
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
        tagId: -workspaceId, // Negative ID to distinguish from real folders
        folderId: -workspaceId,
        name: workspaceName,
        description: workspaceData.description,
        color: workspaceData.color,
        createdAt: new Date(workspaceData.createdAt),
        isActive: !workspaceData.isArchived,
        depth: 0,
        id: -workspaceId,
        isArchived: workspaceData.isArchived,
        children: children,
        isExpanded: true,
    };
}
