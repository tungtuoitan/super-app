/**
 * Editor Toolbar Helper — Thin Coordinator
 *
 * Routes save/cancel actions to per-feature save hooks via moduleRegistry.
 * Each feature owns its own save logic; this coordinator just dispatches.
 */

import { useEditorTabHelper } from "./useEditorTab.helper";
import { parseApiError, isUnauthorizedError } from "@/shared";
import { useConsoleHelper } from "@/shared";
import { moduleRegistry } from "@/shell/moduleRegistry";
import { useEditorTabBarStore } from "../store/EditorTab.store";
import { useKeywordHelper } from "../../shared/keyword/useKeyword.helper";

export const useEditorToolbarHelper = () => {
    const _console = useConsoleHelper();
    const { getActiveTab } = useEditorTabHelper();
    const { isSaving, setIsSaving } = useEditorTabBarStore();
    const { setOpenTabs } = useEditorTabBarStore();
    const { loadKeywords } = useKeywordHelper();

    const activeTab = getActiveTab();

    // Collect save handlers from all registered modules
    // eslint-disable-next-line react-hooks/rules-of-hooks -- registry is immutable after startup; hook count is stable
    const handlers = moduleRegistry.getAll()
        .filter((m) => m.useSaveActions != null)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        .map((m) => m.useSaveActions!());

    // ── Status derivations (simple, stays in coordinator) ────────────────────

    const _deleteStatusText = (() => {
        if (!activeTab) return "No Tab";
        const data = activeTab.data as { deletedAt?: any } | null;
        return data?.deletedAt ? "Deleted" : "Existing";
    })();

    const _itemId = (() => {
        if (!activeTab) return null;
        return (activeTab.data as { id?: number } | null)?.id ?? null;
    })();

    // ── Save orchestrator ────────────────────────────────────────────────────

    const upsertOrchestraitor = async () => {
        if (!activeTab) return;
        setIsSaving(true);

        try {
            const handler = handlers.find((h) => h.handles(activeTab.type));
            if (handler) {
                await handler.onSave(activeTab);
            } else {
                console.error("No save handler for tab type:", activeTab.type);
            }
        } catch (error) {
            console.error("Failed to save:", error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to save ${activeTab.type}: ${errorMessage}`);
            }
        } finally {
            loadKeywords();
            setIsSaving(false);
        }
    };

    // ── Cancel / discard changes ─────────────────────────────────────────────

    const commonCancel = () => {
        if (!activeTab) return;

        if (activeTab.data0) {
            setOpenTabs((prev) =>
                prev.map((tab) =>
                    tab.id === activeTab.id
                        ? { ...tab, data: tab.data0 }
                        : tab,
                ),
            );
            _console.info("Changes discarded");
        }
    };

    return {
        upsertOrchestraitor,
        commonCancel,
        _deleteStatusText,
        _itemId,
    };
};
