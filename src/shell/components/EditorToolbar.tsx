/**
 * Editor Toolbar
 * Shared toolbar for all editor panel types (Note, Workspace, etc.)
 * Displays status info and action buttons based on tab type and state
 */

import React, { useEffect, useRef, useState } from "react";
import { Save, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { useEditorToolbarHelper } from "@/shell/hooks/useEditorToolbar.helper";
import { useGlobalShortcut } from "@/shared/hooks/useGlobalShortcut";
import { constants } from "@/utils/constants";
import { useEditorToolbarStore } from "@/store/editor/EditorToolbar.store";
import { useProjectStore } from "@/store/project/useProject.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { projectService } from "@/services/project.service";
import { Breadcrumb } from "./Breadcrumb";
import { BackButton } from "./BackButton";
import { moduleRegistry } from "@/shell/moduleRegistry";

export function EditorToolbar() {
    const { getActiveTab } = useEditorTabHelper();
    const { isSaving } = useEditorToolbarStore();
    const { projects } = useProjectStore();
    const { $user } = useAuthStore();

    const activeTab = getActiveTab();

    // ── Back button via registry (sync) + async fallback ─────────────────────
    const registryBackButton = activeTab && !activeTab.openedBy
        ? moduleRegistry.getBackButton(activeTab, { projects })
        : null;

    // Async fallback: if registry can't resolve (project not in store), fetch from API
    const [asyncBackButton, setAsyncBackButton] = useState<{ link: string; label: string } | undefined>(undefined);
    useEffect(() => {
        if (registryBackButton || activeTab?.openedBy) {
            setAsyncBackButton(undefined);
            return;
        }
        // Only project module uses getBackButton — if it returned null, project might not be loaded yet
        if (!activeTab || activeTab.type !== constants.vscode.tab.tabTypes.task) {
            setAsyncBackButton(undefined);
            return;
        }
        const task = activeTab.data as { projectId: number };
        let cancelled = false;
        projectService._getProjectById($user.userToken, task.projectId).then(res => {
            if (!cancelled && res.success && res.data?.[0]) {
                setAsyncBackButton({ link: `sa/p${task.projectId}`, label: res.data[0].name });
            }
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [activeTab?.id, registryBackButton]);

    const effectiveOpenedBy = activeTab?.openedBy ?? registryBackButton ?? asyncBackButton;

    // ── Toolbar actions ──────────────────────────────────────────────────────
    const { upsertOrchestraitor, commonCancel } = useEditorToolbarHelper();

    // ── Keyboard shortcut: Ctrl+S / Alt+S → save ────────────────────────────
    const activeTabRef = useRef(activeTab);
    const isSavingRef = useRef(isSaving);
    const upsertRef = useRef(upsertOrchestraitor);
    activeTabRef.current = activeTab;
    isSavingRef.current = isSaving;
    upsertRef.current = upsertOrchestraitor;

    useGlobalShortcut("ctrl+s", { id: "editor-toolbar-save", priority: 50 }, () => {
        if (activeTabRef.current?.hasUnsavedChanges && !isSavingRef.current) {
            upsertRef.current();
        }
        return true;
    });

    useGlobalShortcut("alt+s", { id: "editor-toolbar-save-alt", priority: 50 }, () => {
        if (activeTabRef.current?.hasUnsavedChanges && !isSavingRef.current) {
            upsertRef.current();
        }
        return true;
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
