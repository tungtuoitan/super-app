/**
 * Editor Toolbar
 * Shared toolbar for all editor panel types (Note, Workspace, etc.)
 * Displays status info and action buttons based on tab type and state
 */

import React, { useEffect, useRef, useState } from "react";
import { Save, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/shared";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared";
import { shellConstants, useEditorTabBarHelper } from "@/shell";
import { useGlobalShortcut } from "@/shared";
import { useAuthStore } from "@/shared";
import { Breadcrumb } from "../Breadcrumb";
import { BackButton } from "../BackButton";
import { moduleRegistry } from "@/shell";
import {useEditorTabBarStore} from "@/shell";
import {useEditorToolbarHelper} from "@/shell/hooks/useEditorToolbar.helper";

export function EditorToolbar() {
    const { getActiveTab } = useEditorTabBarHelper();
    const { isSaving } = useEditorTabBarStore();
    const { $user } = useAuthStore();

    const activeTab = getActiveTab();

    // â”€â”€ Back button via registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Toolbar actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const { upsertOrchestraitor, commonCancel } = useEditorToolbarHelper();

    // â”€â”€ Keyboard shortcut: Ctrl+S / Alt+S â†’ save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const activeTabRef = useRef(activeTab);
    const isSavingRef = useRef(isSaving);
    const upsertRef = useRef(upsertOrchestraitor);
    activeTabRef.current = activeTab;
    isSavingRef.current = isSaving;
    upsertRef.current = upsertOrchestraitor;

    // Default handler (priority 0) â€” saves current tab when no inline editor is active.
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
        <div className="h-6 flex items-center justify-between px-4 bg-black border-b border-white/5 gap-2">
            {/* Left: Back button + Breadcrumb */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {effectiveOpenedBy && (
                    <BackButton openedBy={effectiveOpenedBy} />
                )}
                {activeTab?.breadcrumb && activeTab.breadcrumb.length > 0 && (
                    <Breadcrumb items={activeTab.breadcrumb} />
                )}
            </div>

            {/* Action Buttons */}
            <TooltipProvider>
                <div className="flex gap-1">
                    {(activeTab?.data as any)?.deletedAt && !(activeTab?.data as any).isHardDeleted ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={upsertOrchestraitor}
                                        disabled={isSaving}
                                        className="h-8 w-8 text-green-500 hover:bg-green-500/10 disabled:text-white/20"
                                    >
                                        <Undo2 className="h-[18px] w-[18px]" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Restore</p>
                            </TooltipContent>
                        </Tooltip>
                    ) : activeTab && (activeTab.data as any).isHardDeleted ? (
                        <span className="text-xs text-red-500 flex items-center px-2">Permanently deleted - cannot restore</span>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={upsertOrchestraitor}
                                        disabled={!activeTab?.hasUnsavedChanges || isSaving}
                                        className={`h-8 w-8 ${activeTab?.hasUnsavedChanges ? "text-[#4FC3F7] hover:bg-[#4FC3F7]/10" : "text-white/40"} disabled:text-white/20`}
                                    >
                                        <Save className="h-[18px] w-[18px]" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Save (Ctrl+S / Alt+S)</p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {activeTab && !(activeTab.data as any).isHardDeleted && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={commonCancel}
                                        disabled={!activeTab?.hasUnsavedChanges || !!(activeTab?.data as any)?.deletedAt}
                                        className="h-8 w-8 text-white/60 hover:bg-white/10 disabled:text-white/20"
                                    >
                                        <RotateCcw className="h-[18px] w-[18px]" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>
                                    {(activeTab?.data as any)?.deletedAt
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

