import { WorkspaceItem, isFolder } from "../types/workspace.types";
import { WorkspaceItemV2 } from "@/features/workspace/types/workspace-v2.types";
import { constants } from "@/shared";
import type { WorkspaceDTO } from "../types/workspace-dto.types";
import { Folder } from "../types/folder.types";
import { workspaceConstants } from "../workspace.constants";
import { findPathToItem, expandPathToItem } from "./workspace.tree.navigate.utils";

export { findPathToItem, expandPathToItem };

// ============================================
// TYPES
// ============================================

export interface TreeNode {
    id: string;
    name: string;
    data: WorkspaceItem;
    children: TreeNode[];
}

export interface TreeFolder {
    id: string;
    name: string;
    children?: TreeFolder[];
    data: WorkspaceItem;
}

// ============================================
// RECURSIVE HELPERS (prefix with $)
// ============================================

export function $traverse<T extends { children?: T[] }>(nodes: T[], predicate: (node: T) => boolean = () => true): T[] {
    const result: T[] = [];
    function $_traverse(items: T[]) {
        for (const item of items) {
            if (predicate(item)) result.push(item);
            if (item.children && item.children.length > 0) $_traverse(item.children);
        }
    }
    $_traverse(nodes);
    return result;
}

export function $checkSubtree(node: TreeFolder, targetId: number): boolean {
    if (node.data.id === targetId) return true;
    if (node.children && node.children.length > 0) {
        return node.children.some((child) => $checkSubtree(child, targetId));
    }
    return false;
}

export function $findFolderById(folders: Folder[], targetId: number): Folder | undefined {
    for (const folder of folders) {
        if (folder.id === targetId) return folder;
        if (folder.children && folder.children.length > 0) {
            const found = $findFolderById(folder.children, targetId);
            if (found) return found;
        }
    }
    return undefined;
}

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

export function $filterTreeBySearchV2(nodes: TreeFolder[], searchText: string): TreeFolder[] {
    if (!searchText || !searchText.trim()) return nodes;
    const query = searchText.toLowerCase().trim();
    const searchMode = workspaceConstants.search.mode;
    const results: TreeFolder[] = [];

    for (const node of nodes) {
        const matchesSearch = node.name?.toLowerCase().includes(query);
        const filteredChildren = node.children && node.children.length > 0
            ? $filterTreeBySearchV2(node.children, searchText)
            : [];
        const hasMatchingDescendant = filteredChildren.length > 0;

        if (matchesSearch || hasMatchingDescendant) {
            let childrenToInclude: TreeFolder[];
            if (matchesSearch) {
                childrenToInclude = searchMode === "showAllDescendants" ? (node.children || []) : filteredChildren;
            } else {
                childrenToInclude = filteredChildren;
            }
            results.push({ ...node, children: childrenToInclude });
        }
    }
    return results;
}

export function $transformItemToFolder(item: WorkspaceItem): Folder | null {
    if (!isFolder(item)) return null;
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
// TREE UTILITIES
// ============================================

export function isDescendant(targetId: number, potentialParentId: number, treeData: TreeFolder[]): boolean {
    const parentNode = $traverse(treeData).find((t) => t.data.id === potentialParentId);
    if (!parentNode) return false;
    return $checkSubtree(parentNode, targetId);
}

export function filterTopLevelParents(selectedIds: number[], treeData: TreeFolder[]): number[] {
    if (selectedIds.length <= 1) return selectedIds;
    const topLevel: number[] = [];
    for (const id of selectedIds) {
        const isDescendantOfOther = selectedIds
            .filter(otherId => otherId !== id)
            .some(parentId => isDescendant(id, parentId, treeData));
        if (!isDescendantOfOther) topLevel.push(id);
    }
    return topLevel;
}

export function getAllVisibleFolderIds(treeData: TreeFolder[]): number[] {
    return $traverse(treeData).map((node) => (node.data as any).id);
}

export function transformItemsToTreeData(items: WorkspaceItem[]): TreeFolder[] {
    return items
        .filter((item) => item && item.id !== undefined && item.id !== null)
        .map((item) => ({
            id: item.id.toString(),
            name: item.name || "Unsaved",
            data: item,
            children: isFolder(item) && item.children && item.children.length > 0 ? transformItemsToTreeData(item.children) : [],
        }));
}

function sortTreeNodes(nodes: TreeFolder[]): TreeFolder[] {
    return nodes.sort((a, b) => {
        const aItem = a.data as any;
        const bItem = b.data as any;
        const aType = aItem.entityType || 0;
        const bType = bItem.entityType || 0;
        if (aType === 2 && bType !== 2) return -1;
        if (aType !== 2 && bType === 2) return 1;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), undefined, { numeric: true });
    });
}

function $sortChildrenRecursively(nodes: TreeFolder[]) {
    nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
            sortTreeNodes(node.children);
            $sortChildrenRecursively(node.children);
        }
    });
}

export function createWorkspaceRootFolder(
    workspaceId: number,
    workspaceName: string,
    workspaceData: { description?: string; color?: string; createdAt: string; isArchived: boolean },
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

export function buildTreeFromV2Items(items: WorkspaceItemV2[]): TreeFolder[] {
    const workspaceItemIdToNodeMap = new Map<number, TreeFolder>();
    const allTreeNodes: TreeFolder[] = [];

    items.forEach((workspaceItem) => {
        const treeNode: TreeFolder = {
            id: workspaceItem.id.toString(),
            name: workspaceItem.data.name,
            data: workspaceItem as any,
            children: [],
        };
        workspaceItemIdToNodeMap.set(workspaceItem.id, treeNode);
        allTreeNodes.push(treeNode);
    });

    const rootNodes: TreeFolder[] = [];

    items.forEach((workspaceItem) => {
        const currentNode = workspaceItemIdToNodeMap.get(workspaceItem.id);
        if (!currentNode) return;

        const parentWorkspaceItemId = workspaceItem.parentId;

        if (parentWorkspaceItemId === null || parentWorkspaceItemId === undefined) {
            rootNodes.push(currentNode);
        } else {
            const parentNode = workspaceItemIdToNodeMap.get(parentWorkspaceItemId);
            if (parentNode) {
                parentNode.children!.push(currentNode);
            } else {
                console.warn(`⚠️ Parent workspace_item ID ${parentWorkspaceItemId} not found for item ${workspaceItem.id}, treating as root`);
                rootNodes.push(currentNode);
            }
        }
    });

    sortTreeNodes(rootNodes);
    $sortChildrenRecursively(rootNodes);
    return rootNodes;
}

export function transformToTreeData(data: WorkspaceDTO | null | undefined, searchText: string): TreeFolder[] {
    if (!data || !data.flatData) return [];

    const v2Items = data.flatData;
    let treeRoots = buildTreeFromV2Items(v2Items);

    if (searchText && searchText.trim()) {
        treeRoots = $filterTreeBySearchV2(treeRoots, searchText);
    }

    const workspaceRootV2: TreeFolder = {
        id: `${workspaceConstants.root.workspaceItemId}`,
        name: data.name,
        data: {
            id: workspaceConstants.root.workspaceItemId,
            workspaceId: data.id,
            parentId: null,
            entityType: 2,
            entityId: workspaceConstants.root.entityId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            deletedAt: null,
            level: 0,
            position: 0,
            accessType: "owner" as const,
            isOriginal: true,
            data: {
                id: workspaceConstants.root.entityId,
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
        } as any,
        children: treeRoots,
    };
    return [workspaceRootV2];
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
    expandPathToItem,
};
