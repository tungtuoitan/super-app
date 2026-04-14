/**
 * Editor Toolbar Helper — Thin Coordinator
 *
 * Routes save/cancel actions to per-feature save hooks.
 * Each feature owns its own save logic; this coordinator just dispatches.
 */

import { useCallback } from "react";
import type { BaseTab } from "@/types/editor/tab.types";
import type { Note } from "@/features/note/types/note.types";
import { constants } from "@/utils/constants";
import { useEditorTabHelper } from "./useEditorTab.helper";
import { useEditorTabsStore } from "@/store/index";
import { useEditorToolbarStore } from "@/store/editor/EditorToolbar.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useStandardRegistryHelper } from "@/hooks/standardRegistry/useStandardRegistry.helper";
import { useConsoleHelper } from "@/hooks/console/useConsole.helper";
import type { Ws } from "@/types/workspace.types";
import type { Project } from "@/features/project/store/useProject.store";
import type { Task } from "@/features/task/store/useTask.store";

// Feature save actions
import { useNoteSaveActions } from "@/features/note/hooks/useNoteSaveActions";
import { useWsSaveActions } from "@/features/ws/hooks/useWsSaveActions";
import { useProjectSaveActions } from "@/features/project/hooks/useProjectSaveActions";
import { useLifeLogSaveActions } from "@/features/lifeLog/hooks/useLifeLogSaveActions";

export const useEditorToolbarHelper = () => {
    const _console = useConsoleHelper();
    const { getActiveTab } = useEditorTabHelper();
    const { isSaving, setIsSaving } = useEditorToolbarStore();
    const { setOpenTabs } = useEditorTabsStore();
    const { loadKeywords } = useStandardRegistryHelper();

    const activeTab = getActiveTab();

    // Collect all feature save handlers
    const noteActions = useNoteSaveActions();
    const wsActions = useWsSaveActions();
    const projectActions = useProjectSaveActions();
    const lifeLogActions = useLifeLogSaveActions();
    const handlers = [noteActions, wsActions, projectActions, lifeLogActions];

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

    const upsertOrchestraitor = useCallback(async () => {
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
    }, [activeTab, ...handlers.map((h) => h.onSave), setIsSaving, loadKeywords, _console]);

    // ── Cancel / discard changes ─────────────────────────────────────────────

    const commonCancel = useCallback(() => {
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
    }, [activeTab, setOpenTabs, _console]);

    return {
        upsertOrchestraitor,
        commonCancel,
        _deleteStatusText,
        _itemId,
    };
};
