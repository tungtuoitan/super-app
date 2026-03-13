import type { KItemV2 } from "../types/K-v2.types";

export const DND_TYPE = "K_NODE_CARD";
export const CARD_HEIGHT = "h-52";

export interface BreadcrumbEntry {
    id: number | null;
    name: string;
    color?: string | null;
}

export function getLevelStyle(level: number): { className: string; style?: React.CSSProperties } {
    if (level === 1) return { className: "", style: { backgroundColor: "#111318" } };
    if (level === 2) return { className: "", style: { backgroundColor: "#14171C" } };
    if (level === 3) return { className: "", style: { backgroundColor: "#181A20" } };
    return { className: "", style: { backgroundColor: "#1B1D23" } };
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
