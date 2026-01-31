import React, { useEffect, useRef } from "react";
import { NoteEditorPanel, ConfirmCloseDialog, EditorToolbar } from "@/Components/Editor";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { WsEditorPanel } from "@/Components/Workspace";
import { TrackingGraphPanel } from "@/Components/TrackingGraph";
import { ProjectEditorPanel } from "@/Components/Project/ProjectEditorPanel";
import { TaskEditorPanel } from "@/Components/Project/TaskEditorPanel";
import { useEditorTabsStore, useNavigationHistoryStore } from "@/store/index";
import { BaseTab } from "@/types/editor/tab.types";
import { constants } from "@/utils/constants";
import { OpenTabsSync } from "../../HeadlessComponents/vsCode/OpenTabsSync";
import { Track } from "@radix-ui/react-slider";
import { TrackTabNavigation } from "@/HeadlessComponents/vsCode/TrackTabNavigation";
import { NavigationHistorySync } from "@/HeadlessComponents/vsCode/NavigationHistorySync";
import { TabBar } from "./TabBar";
import {Note} from "@/types/index";

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
    const { past, setPast, present, setPresent, future, setFuture } = useNavigationHistoryStore();

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

    // Helper to find tab by entity id
    const findTabByEntity = (entry: any) => {
        if (entry.type === "note") {
            return openTabs.find((t) => t.type === constants.vscode.tab.tabTypes.note && (t.data as Note).id === parseInt(entry.itemId));
        } else if (entry.type === "workspace") {
            return openTabs.find((t) => t.type === constants.vscode.tab.tabTypes.workspace && (t.data as any).id === parseInt(entry.itemId));
        }
        return undefined;
    };

    //* chỗ này để debug, khi tab k có trong openTabs (có thể tab đã bị close) thì sẽ là Unknown
    // useEffect(() => {
    //     console.log("========================================== Updated:", {
    //         past: past.map((e) => (findTabByEntity(e)?.title ?? "Unknown") + " " + (e.mdPos?.lineNumber ?? "-")).join(", "),
    //         present: present ? (findTabByEntity(present)?.title ?? "Unknown") + " " + (present.mdPos?.lineNumber ?? "-") : "None",
    //         future: future.map((e) => (findTabByEntity(e)?.title ?? "Unknown") + " " + (e.mdPos?.lineNumber ?? "-")).join(", "),
    //     });
    // }, [present]);

    return (
        <div className="w-full h-full bg-editor-bg flex flex-col overflow-hidden">
            {/* LocalStorage sync components */}
            {/* <NavigationHistorySync /> */}
            <TrackTabNavigation />
            <OpenTabsSync />

            {/* Tab bar */}
            <TabBar />

            {/* Shared Toolbar - not shown for tracking graph tabs */}
            {activeTab && activeTab.type !== constants.vscode.tab.tabTypes.trackingGraph && <EditorToolbar />}

            {/* Main content area */}
            <div id="mainContentArea" ref={editorAreaRef} className="flex-1 overflow-hidden flex">
                {activeTab ? (
                    // Render appropriate editor based on tab type
                    <>
                        {activeTab.type === constants.vscode.tab.tabTypes.note && <NoteEditorPanel tab={activeTab} />}
                        {activeTab.type === constants.vscode.tab.tabTypes.workspace && <WsEditorPanel tab={activeTab} />}
                        {activeTab.type === constants.vscode.tab.tabTypes.project && <ProjectEditorPanel tab={activeTab} />}
                        {activeTab.type === constants.vscode.tab.tabTypes.task && <TaskEditorPanel tab={activeTab} />}
                        {activeTab.type === constants.vscode.tab.tabTypes.trackingGraph && <TrackingGraphPanel tab={activeTab} />}
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
