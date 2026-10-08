/**
 * Editor Toolbar
 * Shared toolbar for all editor panel types (Note, Workspace, etc.)
 * Displays status info and action buttons based on tab type and state
 */

import React, { useEffect, useRef, useState } from "react";
import { Save, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/shared";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared";
import { useGlobalShortcut } from "@/shared";
import { useAuthStore } from "@/shared";
import { Breadcrumb } from "../Breadcrumb";
import { BackButton } from "../BackButton";
import {useEditorToolbarHelper} from "@/shell/hooks/useEditorToolbar.helper";
import {useEditorTabBarHelper} from "@/shell/hooks/useEditorTabBar.helper";
import {useEditorTabBarStore} from "@/shell/store/EditorTab.store";
import {moduleRegistry} from "@/shell/moduleRegistry";
import { getTabDeleteState } from "@/shell/types/tab.types";

export function EditorToolbar() {
    const { getActiveTab } = useEditorTabBarHelper();
    const { isSaving } = useEditorTabBarStore();
    const { $user } = useAuthStore();

    const activeTab = getActiveTab();
    const { isDeleted, isPermanentlyDeleted } = activeTab
        ? getTabDeleteState(activeTab)
        : { isDeleted: false, isPermanentlyDeleted: false };

    // ── Back button via registry ───────────────────────────────────────────────
    // Sync: hook-based resolvers read from store (e.g. projects already loaded)
    // eslint-disable-next-line react-hooks/rules-of-hooks -- registry is immutable after startup; hook count is stable
    const backButtonGetters = moduleRegistry.getAll()
        .filter((m) => m.useGetBackButton != null)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        .map((m) => m.useGetBackButton!());

    const registryBackButton = activeTab && !activeTab.openedBy
        ? backButtonGetters.reduce<{ link: string; label: string } | null>(
            (found, getter) => found ?? getter(activeTab),
            null
          )
        : null;

    // Async fallback: if sync resolver returned null (data not in store yet), fetch from API
    const [asyncBackButton, setAsyncBackButton] = useState<{ link: string; label: string } | undefined>(undefined);
    useEffect(() => {
        if (registryBackButton || activeTab?.openedBy) {
            setAsyncBackButton(undefined);
            return;
        }
        if (!activeTab) { setAsyncBackButton(undefined); return; }

        const asyncModules = moduleRegistry.getAll().filter((m) => m.getBackButtonAsync != null);
        if (asyncModules.length === 0) { setAsyncBackButton(undefined); return; }

        let cancelled = false;
        Promise.all(asyncModules.map((m) => m.getBackButtonAsync!(activeTab, $user.userToken)))
            .then((results) => {
                if (!cancelled) setAsyncBackButton(results.find((r) => r !== null) ?? undefined);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [activeTab?.id, registryBackButton]);

    const effectiveOpenedBy = activeTab?.openedBy ?? registryBackButton ?? asyncBackButton;

    // ── Toolbar actions ────────────────────────────────────────────────────────
    const { upsertOrchestrator, commonCancel } = useEditorToolbarHelper();

    // ── Keyboard shortcut: Ctrl+S / Alt+S → save ──────────────────────────────
    const activeTabRef = useRef(activeTab);
    const isSavingRef = useRef(isSaving);
    const upsertRef = useRef(upsertOrchestrator);
    activeTabRef.current = activeTab;
    isSavingRef.current = isSaving;
    upsertRef.current = upsertOrchestrator;

    // Default handler (priority 0) — saves current tab when no inline editor is active.
    // No `enabled` condition: always registered so browser default is always suppressed.
    // The callback guards internally with refs to avoid stale closure.
    useGlobalShortcut("ctrl+s", { id: "editor-toolbar-save" }, () => {
        if (activeTabRef.current?.hasUnsavedChanges && !isSavingRef.current) {
            upsertRef.current();
        }
    });

    useGlobalShortcut("alt+s", { id: "editor-toolbar-save-alt" }, () => {
        if (activeTabRef.current?.hasUnsavedChanges && !isSavingRef.current) {
            upsertRef.current();
        }
    });

    return (
        // View header (#1514): back · breadcrumb (or tab title) · actions — was a 24px toolbar
        <div className="h-10 flex items-center justify-between px-4 bg-editor-bg border-b border-editor-border gap-2">
            {/* Left: Back button + Breadcrumb */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {effectiveOpenedBy && (
                    <BackButton openedBy={effectiveOpenedBy} />
                )}
                {activeTab?.breadcrumb && activeTab.breadcrumb.length > 0 ? (
                    <Breadcrumb items={activeTab.breadcrumb} />
                ) : (
                    activeTab?.title && <span className="truncate text-[13px] font-medium text-foreground">{activeTab.title}</span>
                )}
            </div>

            {/* Action Buttons */}
            <TooltipProvider>
                <div className="flex gap-0.5">
                    {isDeleted && !isPermanentlyDeleted ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={upsertOrchestrator}
                                        disabled={isSaving}
                                        className="h-7 w-7 text-sa-good hover:bg-sa-good/10 disabled:text-muted-foreground/40"
                                    >
                                        <Undo2 className="h-4 w-4" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Restore</p>
                            </TooltipContent>
                        </Tooltip>
                    ) : isPermanentlyDeleted ? (
                        <span className="text-xs text-sa-danger flex items-center px-2">Permanently deleted - cannot restore</span>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={upsertOrchestrator}
                                        disabled={!activeTab?.hasUnsavedChanges || isSaving}
                                        className={`h-7 w-7 ${activeTab?.hasUnsavedChanges ? "text-sa-amber hover:bg-sa-amber/10" : "text-muted-foreground"} disabled:text-muted-foreground/40`}
                                    >
                                        <Save className="h-4 w-4" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Save (Ctrl+S / Alt+S)</p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {activeTab && !isPermanentlyDeleted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={commonCancel}
                                        disabled={!activeTab?.hasUnsavedChanges || isDeleted}
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-sa-hover-strong disabled:text-muted-foreground/40"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    {isDeleted
                                        ? "Cannot edit deleted item"
                                        : "Discard Changes"}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </TooltipProvider>
        </div>
    );
}
