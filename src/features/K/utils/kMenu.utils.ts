import type { Folder } from "../types/folder.type";

/**
 * Traverse tree and collect all visible node IDs in order (for VS Code-like navigation)
 */
export function $getAllVisibleNodeIds(items: any[]): number[] {
    const result: number[] = [];
    function $traverse(nodes: any[]) {
        for (const node of nodes) {
            if (node.id) result.push(node.id);
            if (node.children && node.children.length > 0) $traverse(node.children);
        }
    }
    $traverse(items);
    return result;
}

/**
 * Recursively collect all descendants (children, grandchildren, etc.)
 * Returns array of all items in the subtree including the root.
 */
export function $collectAllDescendants(folder: Folder): Folder[] {
    const descendants: Folder[] = [folder];
    if (folder.children && folder.children.length > 0) {
        for (const child of folder.children) {
            descendants.push(...$collectAllDescendants(child));
        }
    }
    return descendants;
}

/**
 * Find folder by ID in tree structure
 */
export function $findFolderById(items: any[], folderId: number): Folder | null {
    for (const item of items) {
        if (item.id === folderId) return item;
        if (item.children?.length > 0) {
            const found = $findFolderById(item.children, folderId);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Count total children recursively
 */
export function $countChildren(folder: any): number {
    if (!folder.children || folder.children.length === 0) return 0;
    return folder.children.length + folder.children.reduce(
        (sum: number, child: any) => sum + $countChildren(child), 0,
    );
}

/**
 * Recursively remove items by IDs from tree
 */
export function $removeItemsFromTree(items: any[], idsToRemove: Set<number>): any[] {
    return items
        .filter((item) => !idsToRemove.has(item.id))
        .map((item) => ({
            ...item,
            children: item.children ? $removeItemsFromTree(item.children, idsToRemove) : [],
        }));
}
