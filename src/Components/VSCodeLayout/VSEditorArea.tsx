import React, { useEffect, useRef } from "react";
import { X, FileText, Folder } from "lucide-react";
import { NoteEditorPanel, ConfirmCloseDialog, EditorToolbar } from "@/Components/Editor";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { WsEditorPanel } from "@/Components/Workspace";
import { useEditorTabsStore } from "@/store/index";
import { BaseTab } from "@/types/editor/tab.types";
import { constants } from "@/utils/constants";
import { OpenTabsSync } from "../../HeadlessComponents/OpenTabsSync";
import { Track } from "@radix-ui/react-slider";
import { TrackTabNavigation } from "HeadlessComponents/TrackTabNavigation";
import { NavigationHistorySync } from "HeadlessComponents/NavigationHistorySync";

/**
 * Get icon component based on tab type
 */
function getTabIcon(type: string) {
    switch (type) {
        case constants.vscode.tab.tabTypes.note:
            return FileText;
        case constants.vscode.tab.tabTypes.workspace:
            return Folder;
        default:
            return FileText;
    }
}

/**
 * VSEditorArea - Main editor area for note content
 *
 * Content:
 * - Note detail view when a note is selected
 * - Welcome/empty state when no note is selected
 */
export function VSEditorArea() {
    const { openTabs, activeTabId, confirmCloseTabId, setConfirmCloseTabId, isLoadingTabs, editorAreaRef } = useEditorTabsStore();
    const { closeTab, getActiveTab, updateActiveTab } = useEditorTabHelper();

    // Get active tab
    const activeTab = getActiveTab();

    const handleCloseTab = (event: React.MouseEvent, tabId: string) => {
        event.stopPropagation();
        closeTab(tabId);
    };

    const handleConfirmClose = () => {
        if (confirmCloseTabId) {
            closeTab(confirmCloseTabId, true); // Force close
            setConfirmCloseTabId(null);
        }
    };

    return (
        <div className="w-full h-full bg-editor-bg flex flex-col overflow-hidden">
            {/* LocalStorage sync components */}
            <NavigationHistorySync />
            <TrackTabNavigation />
            <OpenTabsSync />

            {/* Tab bar */}
            <div className="min-h-[35px] flex items-start border-b border-editor-border bg-editor-sidebar">
                {isLoadingTabs ? (
                    <div className="px-4 w-full h-[35px] flex items-center gap-2">
                        <div className="h-4 w-24 bg-muted/20 animate-pulse rounded"></div>
                        <div className="h-4 w-32 bg-muted/20 animate-pulse rounded"></div>
                        <div className="h-4 w-20 bg-muted/20 animate-pulse rounded"></div>
                    </div>
                ) : openTabs.length > 0 ? (
                    <div className="flex-1 flex flex-wrap">
                        {openTabs.map((tab: BaseTab) => {
                            const isDeleted = !!tab.data.deletedAt;
                            const isHardDeleted = !!(tab.data as any).isHardDeleted;
                            const TabIcon = getTabIcon(tab.type);
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => updateActiveTab(tab.id)}
                                    className={`
                    group h-[35px] px-3 flex items-center gap-2
                    border-r border-b 
                    ${
                        activeTabId === tab.id
                            ? "bg-editor-bg text-editor-fg border-b-transparent border-t-2 border-t-blue-500"
                            : "bg-transparent text-muted-foreground  border-t border-t-transparent text-gray-600"
                    }
                  `}
                                >
                                    <TabIcon
                                        className={`w-4 h-4 ${isDeleted ? "text-gray-500" : tab.type === constants.vscode.tab.tabTypes.note ? "text-blue-400" : "text-gray-400"} ${activeTabId === tab.id ? "opacity-100" : "opacity-50"}`}
                                    />
                                    {/* ${activeTabId === tab.id ? 'font-medium' : 'font-normal'} */}
                                    <span className={`text-[13px] whitespace-nowrap ${isDeleted ? "text-muted-foreground/40 line-through" : ""}`}>
                                        {tab.title.length > 40 ? tab.title.slice(0, 17) + "..." : tab.title}
                                        {tab.hasUnsavedChanges && " ●"}
                                        {isHardDeleted ? " [Permanently Deleted]" : isDeleted ? " [Deleted]" : ""}
                                    </span>
                                    <button
                                        onClick={(e) => handleCloseTab(e, tab.id)}
                                        className="p-0.5 hover:bg-editor-hover rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="px-4 w-full h-[35px] flex items-center">
                        <p className="text-[13px] text-muted-foreground/70 italic">No tabs open</p>
                    </div>
                )}
            </div>

            {/* Shared Toolbar */}
            {activeTab && <EditorToolbar />}

            {/* Main content area */}
            <div id="mainContentArea" ref={editorAreaRef} className="flex-1 overflow-hidden flex">
                {activeTab ? (
                    // Render appropriate editor based on tab type
                    <>
                        {activeTab.type === constants.vscode.tab.tabTypes.note && <NoteEditorPanel tab={activeTab} />}
                        {activeTab.type === constants.vscode.tab.tabTypes.workspace && <WsEditorPanel tab={activeTab} />}
                    </>
                ) : (
                    // Welcome/empty state
                    <div className="flex-1 flex items-center justify-center text-muted-foreground/70">
                        <div className="text-center">
                            <h2 className="text-xl font-semibold mb-1">Welcome to {constants.vscode.displayNames.notes}</h2>
                            <p className="text-sm">Select a note from the sidebar to view its details</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm close dialog */}
            <ConfirmCloseDialog
                open={!!confirmCloseTabId}
                tabTitle={confirmCloseTabId ? activeTab?.title || "" : ""}
                onConfirm={handleConfirmClose}
                onCancel={() => setConfirmCloseTabId(null)}
            />
        </div>
    );
}
