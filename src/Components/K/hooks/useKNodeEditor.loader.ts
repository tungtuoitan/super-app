import { useMemo } from "react";
import { useKStore } from "../store/K.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useKLoader } from "./useK.loader";
import { KService } from "../service/K.service";
import { KItemAction } from "../types/K.types";
import { useKNodeEditorStore } from "../store/KNodeEditor.store";
import { getDescendantIds, isAncestorNode } from "./kNodeEditor.miniHelper";
import { generateTempId, collectIdsFromTree } from "../utils/temp-id.utils";
import type { KItemV2 } from "../types/K-v2.types";
import { KtreeMiniHelper } from "./Ktree.miniHelper";

export const useKNodeEditorLoader = () => {
    const {
        rootNode,
        breadcrumb,
        setBreadcrumb,
        editingNodeId,
        setEditingNodeId,
        editDraft,
        setEditDraft,
        editOriginal,
        setEditOriginal,
        setParentPickerNodeId,
        setUnsavedPromptNodeId,
        setPromptFlashTick,
        setInlineNewParentId,
        showDeleted,
        showAllChild,
        inlineNewParentId
    } = useKNodeEditorStore();


    const { currentK, setCurrentK, _treeRef, treeData } = useKStore();
    const { $user } = useAuthStore();
    const { loadTree } = useKLoader();

    const allNodes = useMemo(
        () => (currentK?.id === rootNode.knowledgeId ? currentK.flatData : []),
        [currentK, rootNode.knowledgeId]
    );

    const current = breadcrumb[breadcrumb.length - 1];

    // Depth of the current scope node (card 0) — used to compute relative levels in cards
    const scopeDepth = useMemo(() => {
        if (!current?.id || current.id < 0) return 0;
        return allNodes.find(n => n.id === current.id)?.pathDepth ?? 0;
    }, [current?.id, allNodes]);

    const scopedNodes = useMemo(() => {
        const deletedFilter = (n: KItemV2) => showDeleted || n.deletedAt == null;

        if (current.id === null && rootNode.id < 0) {
            const directChildIds = new Set(
                allNodes.filter(n => n.parentId == null).map(n => n.id)
            );
            return allNodes.filter(n =>
                deletedFilter(n) && (showAllChild || directChildIds.has(n.id))
            );
        }

        const scopeId = current.id ?? rootNode.id;

        if (!showAllChild) {
            // Only direct children of current scope
            return allNodes.filter(n => n.parentId === scopeId && deletedFilter(n));
        }

        const descIds = getDescendantIds(scopeId, allNodes);
        return allNodes.filter(n => descIds.has(n.id) && deletedFilter(n));
    }, [current.id, rootNode.id, allNodes, showDeleted, showAllChild]);

    const handleDrillDown = (node: KItemV2) => {
        if (editingNodeId != null) return;
        setBreadcrumb((prev) => {
            const last = prev[prev.length - 1];
            if (last?.id === node.id) return prev;

            // Build path from current scope to clicked node via parentId chain
            const scopeId = last?.id ?? null;
            const path: Array<{ id: number; name: string; color: string | null }> = [];
            let curr: KItemV2 | undefined = allNodes.find(n => n.id === node.id);
            while (curr) {
                path.unshift({ id: curr.id, name: curr.name, color: curr.color || null });
                if (curr.parentId == null || curr.parentId === scopeId) break;
                curr = allNodes.find(n => n.id === curr!.parentId);
            }
            return [...prev, ...path];
        });
        // Open node in KTree so its direct children are visible
        KtreeMiniHelper.expandPathToItem(_treeRef, treeData, node.id);
    };

    const handleOpenEdit = (node: KItemV2) => {
        if (inlineNewParentId !== undefined) return;
        // Another card is already being edited — flash its prompt instead
        if (editingNodeId != null && editingNodeId !== node.id) {
            const isDirty =
                editDraft.name !== editOriginal.name ||
                editDraft.description !== editOriginal.description ||
                editDraft.icon !== editOriginal.icon ||
                editDraft.color !== editOriginal.color;
            if (isDirty) setUnsavedPromptNodeId(editingNodeId);
            setPromptFlashTick(t => t + 1);
            return;
        }
        const draft = { name: node.name, description: node.description || "", icon: node.icon || null, color: node.color || null };
        setEditingNodeId(node.id);
        setEditDraft(draft);
        setEditOriginal(draft);
    };

    const handleCancelEdit = () => {
        setEditingNodeId(null);
        setUnsavedPromptNodeId(null);
    };

    const handleSubmitEdit = async (node: KItemV2, draft: { name: string; description: string; icon: string | null; color: string | null }) => {
        if (!draft.name.trim()) return;
        setEditingNodeId(null);
        setUnsavedPromptNodeId(null);

        const nodeType = draft.name.trim().endsWith("?") ? "question" : "entity";

        // Optimistic update — show new values immediately, no flicker
        setCurrentK(prev => prev ? {
            ...prev,
            flatData: prev.flatData.map(n => n.id === node.id
                ? { ...n, name: draft.name.trim(), description: draft.description || null, color: draft.color, icon: draft.icon, nodeType }
                : n),
        } : prev);

        try {
            await KService._upsertWorkspaceItems($user.userToken ?? "", rootNode.knowledgeId, [{
                action: KItemAction.Update,
                id: node.id,
                nodeData: {
                    name: draft.name.trim(),
                    description: draft.description || null,
                    color: draft.color,
                    icon: nodeType === "question" ? null : draft.icon,
                    nodeType,
                },
            }]);
            await loadTree();
        } catch (e) {
            // Rollback to original on failure
            setCurrentK(prev => prev ? {
                ...prev,
                flatData: prev.flatData.map(n => n.id === node.id ? node : n),
            } : prev);
            console.error(e);
        }
    };

    const handleDelete = async (nodeId: number) => {
        try {
            await KService._upsertWorkspaceItems($user.userToken ?? "", rootNode.knowledgeId, [{
                action: KItemAction.Delete,
                id: nodeId,
            }]);
            await loadTree();
        } catch (e) {
            console.error(e);
        }
    };

    const handleRestoreCard = async (nodeId: number) => {
        try {
            await KService._upsertWorkspaceItems($user.userToken ?? "", rootNode.knowledgeId, [{
                action: KItemAction.Restore,
                id: nodeId,
            }]);
            await loadTree();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveParent = async (nodeId: number, parentId: number | null) => {
        setParentPickerNodeId(null);

        // Guard: same parent → no-op
        const nodeToMove = allNodes.find(n => n.id === nodeId);
        if (!nodeToMove) return;
        if ((nodeToMove.parentId ?? null) === parentId) return;

        // Guard: cannot move deleted node
        if (nodeToMove.deletedAt != null) return;

        // Guard: cannot move into descendant (cycle)
        if (parentId !== null && isAncestorNode(nodeId, parentId, allNodes)) return;
        try {
            await KService._upsertWorkspaceItems($user.userToken ?? "", rootNode.knowledgeId, [{
                action: KItemAction.Move,
                id: nodeId,
                parentId,
            }]);
            await loadTree();
        } catch (e) {
            console.error(e);
        }
    };

    const handleInlineCreate = async (draft: { name: string; description: string; icon: string | null; color: string | null }, parentId: number | null) => {
        if (!draft.name.trim() || !currentK) return;

        const nodeType = draft.name.trim().endsWith("?") ? "question" : "entity";

        // ── STEP 1: inject virtual node immediately so the card appears at once ──
        const { workspaceItemIds } = collectIdsFromTree(currentK.flatData);
        const tempId = generateTempId(workspaceItemIds);

        const virtualNode: KItemV2 = {
            id: tempId,
            knowledgeId: rootNode.knowledgeId,
            parentId: parentId ?? null,
            name: draft.name.trim(),
            description: draft.description || null,
            color: nodeType === "question" ? null : draft.color,
            icon: nodeType === "question" ? null : draft.icon,
            nodeType,
            pathDepth: parentId != null
                ? (currentK.flatData.find(n => n.id === parentId)?.pathDepth ?? 0) + 1
                : 1,
            deletedAt: null,
        } as KItemV2;

        setCurrentK(prev => prev ? { ...prev, flatData: [...prev.flatData, virtualNode] } : prev);
        setInlineNewParentId(undefined);

        // ── STEP 2: persist via API ────────────────────────────────────────────
        try {
            await KService._upsertWorkspaceItems($user.userToken ?? "", rootNode.knowledgeId, [{
                action: KItemAction.Create,
                parentId,
                nodeData: {
                    name: draft.name.trim(),
                    description: draft.description || null,
                    color: nodeType === "question" ? null : draft.color,
                    icon: nodeType === "question" ? null : draft.icon,
                    nodeType,
                },
            }]);

            // ── STEP 3: reload — pass remaining virtual items (excludes the saved tempId) ──
            const remaining = (currentK.flatData).filter(n => n.id < 0 && n.id !== tempId);
            await loadTree(remaining);
        } catch (e) {
            // Rollback: remove the virtual node if API failed
            setCurrentK(prev => prev ? { ...prev, flatData: prev.flatData.filter(n => n.id !== tempId) } : prev);
            console.error(e);
        }
    };

    const handleCancelInline = () => setInlineNewParentId(undefined);

    /** Update icon + color immediately (no edit mode required). Optimistic + rollback. */
    const handleUpdateIcon = async (node: KItemV2, iconType: string | null, color: string) => {
        // Optimistic update
        setCurrentK(prev => prev ? {
            ...prev,
            flatData: prev.flatData.map(n => n.id === node.id
                ? { ...n, icon: iconType, color }
                : n),
        } : prev);

        try {
            await KService._upsertWorkspaceItems($user.userToken ?? "", rootNode.knowledgeId, [{
                action: KItemAction.Update,
                id: node.id,
                nodeData: {
                    name: node.name,
                    description: node.description || null,
                    color,
                    icon: iconType,
                },
            }]);
            await loadTree();
        } catch (e) {
            // Rollback to original on failure
            setCurrentK(prev => prev ? {
                ...prev,
                flatData: prev.flatData.map(n => n.id === node.id ? node : n),
            } : prev);
            console.error(e);
        }
    };

    return {
        allNodes,
        scopedNodes,
        scopeDepth,
        handleDrillDown,
        handleOpenEdit,
        handleCancelEdit,
        handleSubmitEdit,
        handleDelete,
        handleRestoreCard,
        handleSaveParent,
        inlineNewParentId: undefined, // exposed via store directly
        handleInlineCreate,
        handleCancelInline,
        handleUpdateIcon,
    };
};
