import { useEffect, useMemo } from "react";
import { useKStore } from "@/features/K/store/useK.store";
import { storageService, STORAGE_KEYS } from "@/shared";
import { KtreeMiniHelper } from "./kTree.miniHelper";
import {KTreeNode} from "../../types/kV2.type";

function collectSubtreeIds(node: KTreeNode, out: Set<number>) {
    out.add(node.data.id);
    for (const child of node.children ?? []) collectSubtreeIds(child, out);
}

export function useKTreeMark(treeData: KTreeNode[]) {
    const { markedNodeId, setMarkedNodeId, _treeRef, currentK } = useKStore();

    // Load saved mark from storage when workspace changes
    useEffect(() => {
        if (!currentK?.id) return;
        const saved = storageService.get<number>(`${STORAGE_KEYS.K_TREE_MARK}_${currentK.id}`);
        setMarkedNodeId(saved ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentK?.id]);

    // When mark is set: close all → open path to node → expand full subtree → scroll
    useEffect(() => {
        if (!markedNodeId || !_treeRef.current) return;
        const nodeId = markedNodeId; // narrow to number — TypeScript loses narrowing inside async

        const waitForRender = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

        async function applyMark() {
            if (!_treeRef.current) return;

            _treeRef.current.closeAll();
            await waitForRender(100);

            const pathIds = KtreeMiniHelper.findPathToItem(treeData, nodeId);
            if (pathIds.length === 0) return;

            const openWithRetry = async (numId: number, depth: number) => {
                let treeNode = _treeRef.current?.get(numId.toString());
                let retries = 0;
                while (!treeNode && retries < 15) {
                    await waitForRender(50 + depth * 10);
                    treeNode = _treeRef.current?.get(numId.toString());
                    retries++;
                }
                if (treeNode && !treeNode.isOpen) {
                    treeNode.open();
                    await waitForRender(80 + depth * 15);
                }
            };

            for (let i = 0; i < pathIds.length; i++) {
                await openWithRetry(pathIds[i], i);
            }

            try { _treeRef.current?.scrollTo(nodeId.toString()); } catch (_) {}
            await waitForRender(60);

            function findNode(nodes: KTreeNode[], targetId: number): KTreeNode | null {
                for (const n of nodes) {
                    if (n.data.id === targetId) return n;
                    const found = findNode(n.children ?? [], targetId);
                    if (found) return found;
                }
                return null;
            }

            function getLevels(n: KTreeNode, depth: number, acc: number[][]) {
                if (!acc[depth]) acc[depth] = [];
                acc[depth].push(n.data.id);
                for (const child of n.children ?? []) getLevels(child, depth + 1, acc);
            }

            const markedTreeNode = findNode(treeData, nodeId);
            if (!markedTreeNode) return;

            const levels: number[][] = [];
            getLevels(markedTreeNode, 0, levels);

            for (let lvl = 1; lvl < levels.length; lvl++) {
                await waitForRender(40);
                for (const numId of levels[lvl]) {
                    const n = _treeRef.current?.get(numId.toString());
                    if (n && !n.isOpen) n.open();
                }
            }
        }

        applyMark();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [markedNodeId]);

    // Compute the set of node IDs in the marked subtree (null when no mark)
    const markedVisibleIds = useMemo((): Set<number> | null => {
        if (!markedNodeId) return null;
        function find(nodes: KTreeNode[]): Set<number> | null {
            for (const node of nodes) {
                if (node.data.id === markedNodeId) {
                    const ids = new Set<number>();
                    collectSubtreeIds(node, ids);
                    return ids;
                }
                const child = find(node.children ?? []);
                if (child) return child;
            }
            return null;
        }
        return find(treeData);
    }, [markedNodeId, treeData]);

    return { markedNodeId, setMarkedNodeId, markedVisibleIds };
}
