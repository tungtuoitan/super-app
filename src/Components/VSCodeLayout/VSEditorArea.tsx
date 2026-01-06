import React, { useEffect, useRef } from "react";
import { NoteEditorPanel, ConfirmCloseDialog, EditorToolbar } from "@/Components/Editor";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { WsEditorPanel } from "@/Components/Workspace";
import { useEditorTabsStore } from "@/store/index";
import { BaseTab } from "@/types/editor/tab.types";
import { constants } from "@/utils/constants";
import { OpenTabsSync } from "../../HeadlessComponents/vsCode/OpenTabsSync";
import { Track } from "@radix-ui/react-slider";
import { TrackTabNavigation } from "@/HeadlessComponents/vsCode/TrackTabNavigation";
import { NavigationHistorySync } from "@/HeadlessComponents/vsCode/NavigationHistorySync";
import { TabBar } from "./TabBar";

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
            {/* <NavigationHistorySync /> */}
            {/* <TrackTabNavigation /> */}
            <OpenTabsSync />

            {/* Tab bar */}
            <TabBar />

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
