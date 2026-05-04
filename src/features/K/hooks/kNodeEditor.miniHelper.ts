import type { KItemV2 } from "../types/kV2.type";

export interface BreadcrumbEntry {
    id: number | null;
    name: string;
    color?: string | null;
}

export function getDescendantIds(rootId: number, allNodes: KItemV2[]): Set<number> {
    const result = new Set<number>();
    const queue = [rootId];
    while (queue.length > 0) {
        const id = queue.shift()!;
        allNodes.forEach((n) => {
            if (n.parentId === id && !result.has(n.id)) {
                result.add(n.id);
                queue.push(n.id);
            }
        });
    }
    return result;
}

export function isAncestorNode(potentialAncestorId: number, nodeId: number, allNodes: KItemV2[]): boolean {
    let current = allNodes.find((n) => n.id === nodeId);
    while (current?.parentId != null) {
        if (current.parentId === potentialAncestorId) return true;
        current = allNodes.find((n) => n.id === current!.parentId);
    }
    return false;
}
