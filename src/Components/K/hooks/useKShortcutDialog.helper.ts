/**
 * KShortcutDialog Helper Hook
 * Business logic cho shortcut dialog — open/close/load/submit.
 * Pattern: giống useKTab.helper.ts — useCallback, dùng store qua hook, không có state.
 */

import { useCallback } from "react";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useKStore } from "../store/K.store";
import { useKShortcutDialogStore } from "../store/KShortcutDialog.store";
import { KService } from "../service/K.service";
import { KItemAction } from "../types/K.types";
import { useKLoader } from "./useK.loader";
import { useConsoleHelper } from "@/hooks/console/useConsole.helper";
import { useActivityBarStore } from "@/store/index";
import type { KItemV2 } from "../types/K-v2.types";
import type { KDTO } from "../types/K-dto.types";

export function useKShortcutDialogHelper() {
    const { $user } = useAuthStore();
    const { currentK } = useKStore();
    const _console = useConsoleHelper();
    const { loadTree } = useKLoader();
    const { setIsPanelVisible } = useActivityBarStore();

    const {
        parentNode,
        selectedNodes,
        setIsOpen,
        setParentNode,
        setTargetKnowledgeId,
        setTargetTree,
        setIsLoadingTree,
        setSelectedNodes,
        setIsSubmitting,
    } = useKShortcutDialogStore();

    // ── Open ─────────────────────────────────────────────────────────────────

    const openShortcutDialog = useCallback((node: KItemV2 | any) => {
        setParentNode(node as KItemV2);
        // Default: same knowledge — pre-load tree ngay, không cần API call
        setTargetKnowledgeId(currentK?.id ?? null);
        setTargetTree(currentK ?? null);
        setSelectedNodes([]);
        setIsOpen(true);          // VSPanel's useEffect watches isOpen → tự switch sang tab "shortcut"
        setIsPanelVisible(true);  // mở panel nếu đang collapse
    }, [currentK, setParentNode, setTargetKnowledgeId, setTargetTree, setSelectedNodes, setIsOpen, setIsPanelVisible]);

    // ── Close + reset ────────────────────────────────────────────────────────

    const closeShortcutDialog = useCallback(() => {
        setIsOpen(false);
        setParentNode(null);
        setTargetKnowledgeId(null);
        setTargetTree(null);
        setSelectedNodes([]);
    }, [setIsOpen, setParentNode, setTargetKnowledgeId, setTargetTree, setSelectedNodes]);

    // ── Load target knowledge tree ───────────────────────────────────────────

    const loadTargetTree = useCallback(async (knowledgeId: number) => {
        // Same knowledge: reuse currentK trực tiếp — không cần API call
        if (knowledgeId === currentK?.id && currentK) {
            setTargetTree(currentK);
            return;
        }

        if (!$user.userToken) return;
        setIsLoadingTree(true);
        setTargetTree(null);
        // selectedNodes reset bởi KShortcutTab's useEffect (targetKnowledgeId dependency)
        try {
            const res = await KService._getWorkspaceTreeV2($user.userToken, knowledgeId);
            if (res.success && res.object) {
                setTargetTree(res.object as KDTO);
            }
        } catch {
            _console.error("Failed to load knowledge tree");
        } finally {
            setIsLoadingTree(false);
        }
    }, [currentK, $user.userToken, setIsLoadingTree, setTargetTree, _console]);

    // ── Submit — create shortcuts batch (1 API call cho tất cả selectedNodes) ─

    const submitShortcut = useCallback(async () => {
        if (!selectedNodes.length || !currentK) return;

        // Shortcut node → resolve đến original node (A1 → A), vì shortcut không "own" children
        const _pn = parentNode as any;
        const resolvedParentId = _pn?.typeCode === "shortcut" ? _pn?.refTargetId : _pn?.id;
        const parentId = resolvedParentId && resolvedParentId > 0 ? resolvedParentId : null;

        setIsSubmitting(true);
        try {
            const requests = selectedNodes.map((node) => ({
                action:   KItemAction.Create,
                parentId: parentId,
                nodeData: {
                    // Shortcut chỉ cần ref fields — name/icon/color/description
                    // không lưu, resolved từ target via JOIN khi load tree
                    name:                 "_", // dùng "_" vì BE có validation, k dc ""/null
                    refTargetId:          node.id,
                    refTargetKnowledgeId: node.knowledgeId,
                },
            }));

            const result = await KService._upsertWorkspaceItems(
                $user.userToken ?? "",
                currentK.id,
                requests,
            );

            if (!result.success) throw new Error(result.message);

            const label = selectedNodes.length === 1
                ? `Shortcut to "${selectedNodes[0].name}" created`
                : `${selectedNodes.length} shortcuts created`;
            _console.success(label);

            await loadTree();
            closeShortcutDialog();
        } catch (err: any) {
            _console.error(err?.message || "Failed to create shortcuts");
        } finally {
            setIsSubmitting(false);
        }
    }, [
        selectedNodes, currentK, parentNode,
        $user.userToken, setIsSubmitting,
        _console, loadTree, closeShortcutDialog,
    ]);

    return {
        openShortcutDialog,
        closeShortcutDialog,
        loadTargetTree,
        submitShortcut,
    };
}
