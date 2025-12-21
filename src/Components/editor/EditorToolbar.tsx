/**
 * Editor Toolbar
 * Shared toolbar for all editor panel types (Note, Workspace, etc.)
 * Displays status info and action buttons based on tab type and state
 */

import React, {useEffect} from 'react';
import { Save, RotateCcw, Undo2 } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/Components/ui/tooltip';
import {useEditorTabsStore} from '@/store/index';
import {useEditorTabHelper} from '@/hooks/useEditorTab.helper';
import {useNoteUIStore} from '@/store/note/useNoteUI.store';
import {useEditorToolbarHelper} from '@/hooks/useEditorToolbar.helper';
import { constants } from '@/utils/constants';


export function EditorToolbar() {

    const { openTabs, activeTabId, confirmCloseTabId, setConfirmCloseTabId } = useEditorTabsStore()
    const { closeTab, getTabById, handleSetActiveTab } = useEditorTabHelper()

    // Get active tab
    const activeTab = activeTabId ? getTabById(activeTabId) : null

    // Get toolbar actions for active tab
    const { handleSave, handleCancel, handleUndo, anyHasChanges, isSaving, isUndoing, statusText, itemId } = useEditorToolbarHelper()

    useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (activeTab && anyHasChanges && !isSaving) {
            handleSave()
        }
        }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeTab, anyHasChanges, isSaving, handleSave])

    return (
        <div className="h-10 flex items-center justify-between px-4 border-b border-white/10 bg-[rgb(37,37,38)] gap-2">
            {/* Status Info */}
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs ${statusText === 'delete' ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {statusText}
                        </span>
                        <span className={`text-xs ${itemId && itemId < 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                            ID: {itemId || '0'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <TooltipProvider>
                <div className="flex gap-1">
                    {activeTab?.isDeleted ? (
                        // Show Undo button for deleted items
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleUndo}
                                        disabled={isUndoing}
                                        className="h-8 w-8 text-green-500 hover:bg-green-500/10 disabled:text-white/20"
                                    >
                                        <Undo2 className="h-[18px] w-[18px]" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Restore {activeTab.type === constants.tabTypes.note ? constants.displayNames.note : constants.displayNames.workspace}</p>
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        // Show Save button for normal items
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleSave}
                                        disabled={!anyHasChanges || isSaving}
                                        className={`h-8 w-8 ${
                                            anyHasChanges
                                                ? 'text-[#4FC3F7] hover:bg-[#4FC3F7]/10' 
                                                : 'text-white/40'
                                        } disabled:text-white/20`}
                                    >
                                        <Save className="h-[18px] w-[18px]" />
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Save (Ctrl+S)</p>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {/* Cancel/Discard Changes */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCancel}
                                    disabled={!anyHasChanges || activeTab?.isDeleted}
                                    className="h-8 w-8 text-white/60 hover:bg-white/10 disabled:text-white/20"
                                >
                                    <RotateCcw className="h-[18px] w-[18px]" />
                                </Button>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>
                                {activeTab?.isDeleted 
                                    ? `Cannot edit deleted ${activeTab.type === constants.tabTypes.note ? constants.displayNames.note : constants.displayNames.workspace}` 
                                    : 'Discard Changes'}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </TooltipProvider>
        </div>
    );
}
