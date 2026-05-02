import type { TreeFolder } from "./workspace.tree.utils";

/**
 * Find the path (ancestor IDs) from root to target item.
 * Returns array of workspace_items.id from root to target (includes target).
 */
export function findPathToItem(treeData: TreeFolder[], targetId: number): number[] {
    function $findPath(nodes: TreeFolder[], path: number[]): number[] | null {
        for (const node of nodes) {
            const currentId = (node.data as any).id;
            const currentPath = [...path, currentId];

            if (currentId === targetId) {
                return currentPath;
            }

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
 * Expand only the path to target item (collapse everything else).
 * Opens nodes sequentially from root to target, then collapses sibling branches.
 */
export async function expandPathToItem(
    treeRef: React.RefObject<any>,
    treeData: TreeFolder[],
    targetId: number
): Promise<boolean> {
    if (!treeRef.current) return false;

    const pathIds = findPathToItem(treeData, targetId);
    if (pathIds.length === 0) return false;

    const pathIdSet = new Set(pathIds);

    const waitForRender = (ms: number = 50) => new Promise<void>(resolve => {
        setTimeout(resolve, ms);
    });

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
                const openDelay = 80 + depth * 20;
                await waitForRender(openDelay);
            }

            try {
                treeRef.current.scrollTo(id.toString());
                await waitForRender(30);
            } catch (e) {
                // scrollTo might not be available in all versions
            }
        } else {
            console.warn(`[expandPathToItem] Failed to find node ${id} at depth ${depth} after ${maxRetries} retries`);
        }
    }

    await waitForRender(100);

    const closeNonPathNodes = (nodes: TreeFolder[]) => {
        for (const treeNode of nodes) {
            const nodeId = (treeNode.data as any).id;
            const node = treeRef.current.get(nodeId.toString());

            if (!node) continue;

            if (pathIdSet.has(nodeId)) {
                if (treeNode.children && treeNode.children.length > 0) {
                    closeNonPathNodes(treeNode.children);
                }
            } else {
                if (node.isOpen) {
                    node.close();
                }
            }
        }
    };

    closeNonPathNodes(treeData);

    try {
        treeRef.current.scrollTo(targetId.toString());
    } catch (e) {
        // ignore
    }

    return true;
}
