
// ============================================
// TREE NODE TYPE (for react-arborist)
// ============================================

import {KDTO} from "../../types/kDto.type";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import {KItemV2, KTreeNode} from "../../types/kV2.type";



// ============================================
// RECURSIVE HELPERS (prefix $)
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

export function $checkSubtree(node: KTreeNode, targetId: number): boolean {
    if (node.data.id === targetId) return true;
    if (node.children && node.children.length > 0)
        return node.children.some((child) => $checkSubtree(child, targetId));
    return false;
}

/**
 * Filter KTreeNode tree by search text (V2 structure)
 * Includes node if it or any descendant matches.
 * Respects workspaceConstants.search.mode.
 */
export function $filterTreeBySearchV2(nodes: KTreeNode[], searchText: string): KTreeNode[] {
    if (!searchText || !searchText.trim()) return nodes;

    const query = searchText.toLowerCase().trim();
    const searchMode = workspaceConstants.search.mode;
    const results: KTreeNode[] = [];

    for (const node of nodes) {
        const matchesSearch = node.name?.toLowerCase().includes(query);
        const filteredChildren = node.children && node.children.length > 0
            ? $filterTreeBySearchV2(node.children, searchText)
            : [];
        const hasMatchingDescendant = filteredChildren.length > 0;

        if (matchesSearch || hasMatchingDescendant) {
            let childrenToInclude: KTreeNode[];
            if (matchesSearch) {
                childrenToInclude = searchMode === "showAllDescendants" ? node.children || [] : filteredChildren;
            } else {
                childrenToInclude = filteredChildren;
            }
            results.push({ ...node, children: childrenToInclude });
        }
    }
    return results;
}

// ============================================
// TREE HELPERS
// ============================================

export function isDescendant(targetId: number, potentialParentId: number, treeData: KTreeNode[]): boolean {
    const parentNode = $traverse(treeData).find((t) => t.data.id === potentialParentId);
    if (!parentNode) return false;
    return $checkSubtree(parentNode, targetId);
}

/**
 * Filter selected IDs to only top-level parents (remove descendants)
 */
export function filterTopLevelParents(selectedIds: number[], treeData: KTreeNode[]): number[] {
    if (selectedIds.length <= 1) return selectedIds;
    return selectedIds.filter(
        (id) => !selectedIds
            .filter((otherId) => otherId !== id)
            .some((parentId) => isDescendant(id, parentId, treeData))
    );
}

/**
 * Get all visible node IDs from tree (depth-first, display order)
 * Returns k_items.id values
 */
export function getAllVisibleNodeIds(treeData: KTreeNode[]): number[] {
    return $traverse(treeData).map((node) => node.data.id);
}

// @deprecated alias
export const getAllVisibleFolderIds = getAllVisibleNodeIds;

// ============================================
// SORT
// ============================================

function sortTreeNodes(nodes: KTreeNode[]): KTreeNode[] {
    return nodes.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase(), undefined, { numeric: true })
    );
}

function $sortChildrenRecursively(nodes: KTreeNode[]) {
    nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
            sortTreeNodes(node.children);
            $sortChildrenRecursively(node.children);
        }
    });
}

// ============================================
// BUILD TREE FROM FLAT LIST
// ============================================

/**
 * Build hierarchical KTreeNode structure from flat V2 list.
 *
 * k_items.id   = primary key (used as parentId reference — self-referencing)
 * entityId     = entity ID (k_nodes.id)
 * parentId     = parent's k_items.id (null = root)
 */
export function buildTreeFromV2Items(items: KItemV2[]): KTreeNode[] {
    const idToNode = new Map<number, KTreeNode>();
    const allNodes: KTreeNode[] = [];

    items.forEach((item) => {
        const node: KTreeNode = {
            id: item.id.toString(),
            name: item.name,
            data: item,
            children: [],
        };
        idToNode.set(item.id, node);
        allNodes.push(node);
    });

    const rootNodes: KTreeNode[] = [];

    items.forEach((item) => {
        const node = idToNode.get(item.id);
        if (!node) return;

        if (item.parentId === null || item.parentId === undefined) {
            rootNodes.push(node);
        } else {
            const parent = idToNode.get(item.parentId);
            if (parent) {
                parent.children!.push(node);
            } else {
                console.warn(`⚠️ Parent k_items.id ${item.parentId} not found for item ${item.id}, treating as root`);
                rootNodes.push(node);
            }
        }
    });

    sortTreeNodes(rootNodes);
    $sortChildrenRecursively(rootNodes);

    return rootNodes;
}

// ============================================
// TRANSFORM DTO → TREE DATA
// ============================================

/**
 * Transform KDTO to react-arborist tree data.
 * Wraps nodes under a K root node.
 */
export function transformToTreeData(data: KDTO | null | undefined, searchText: string): KTreeNode[] {
    if (!data || !data.flatData) return [];

    let treeRoots = buildTreeFromV2Items(data.flatData);

    if (searchText && searchText.trim()) {
        treeRoots = $filterTreeBySearchV2(treeRoots, searchText);
    }

    const kRootNode: KTreeNode = {
        id: `${workspaceConstants.root.workspaceItemId}`,
        name: data.name,
        data: {
            id: workspaceConstants.root.workspaceItemId,
            knowledgeId: data.id,
            parentId: null,
            name: data.name,
            description: data.description,
            color: undefined,
            icon: undefined,
            pathIds: "/",
            pathDepth: 0,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            deletedAt: null,
            isExpanded: true,
            isSelected: false,
        },
        children: treeRoots,
    };

    return [kRootNode];
}

// ============================================
// PATH / EXPAND HELPERS
// ============================================

export function findPathToItem(treeData: KTreeNode[], targetId: number): number[] {
    function $findPath(nodes: KTreeNode[], path: number[]): number[] | null {
        for (const node of nodes) {
            const currentId = node.data.id;
            const currentPath = [...path, currentId];
            if (currentId === targetId) return currentPath;
            if (node.children && node.children.length > 0) {
                const found = $findPath(node.children, currentPath);
                if (found) return found;
            }
        }
        return null;
    }
    return $findPath(treeData, []) || [];
}

export async function expandPathToItem(
    treeRef: React.RefObject<any>,
    treeData: KTreeNode[],
    targetId: number
): Promise<boolean> {
    if (!treeRef.current) return false;

    const pathIds = findPathToItem(treeData, targetId);
    if (pathIds.length === 0) return false;

    const pathIdSet = new Set(pathIds);
    const waitForRender = (ms = 50) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < pathIds.length; i++) {
        const id = pathIds[i];
        const depth = i;
        let node = treeRef.current.get(id.toString());
        let retries = 0;
        const maxRetries = 10 + depth * 2;
        const retryDelay = 50 + depth * 10;

        while (!node && retries < maxRetries) {
            await waitForRender(retryDelay);
            node = treeRef.current.get(id.toString());
            retries++;
        }

        if (node) {
            if (!node.isOpen) {
                node.open();
                await waitForRender(80 + depth * 20);
            }
            try {
                treeRef.current.scrollTo(id.toString());
                await waitForRender(30);
            } catch (_) {}
        }
    }

    await waitForRender(100);

    const closeNonPathNodes = (nodes: KTreeNode[]) => {
        for (const treeNode of nodes) {
            const nodeId = treeNode.data.id;
            const node = treeRef.current.get(nodeId.toString());
            if (!node) continue;
            if (pathIdSet.has(nodeId)) {
                if (treeNode.children && treeNode.children.length > 0) closeNonPathNodes(treeNode.children);
            } else {
                if (node.isOpen) node.close();
            }
        }
    };

    closeNonPathNodes(treeData);

    try { treeRef.current.scrollTo(targetId.toString()); } catch (_) {}

    return true;
}

// ============================================
// REMOVE ITEMS HELPER
// ============================================

export function $removeItems(flatData: KItemV2[], idsToRemove: Set<number>): KItemV2[] {
    return flatData.filter((item) => !idsToRemove.has(item.id));
}

// ============================================
// EXPORT OBJECT
// ============================================

export const KtreeMiniHelper = {
    $traverse,
    $checkSubtree,
    $filterTreeBySearchV2,
    isDescendant,
    getAllVisibleNodeIds,
    getAllVisibleFolderIds,
    filterTopLevelParents,
    buildTreeFromV2Items,
    transformToTreeData,
    findPathToItem,
    expandPathToItem,
    $removeItems,
};



