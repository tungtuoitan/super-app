import React from "react";
import { ConfirmCloseDialog } from "@/shell";
import { EditorToolbar } from "@/shell";
import { useEditorTabHelper } from "@/shell";
import { constants } from "@/utils/constants";
import { useOpenTabSync } from "../../hooks/useOpenTabsSync";
import { TabBar } from "./TabBar";
import { moduleRegistry } from "@/shell";
import type { BaseTab } from "@/shell";
import {useEditorTabBarStore} from "@/shell";

/**
 * VSEditorArea — main editor area.
 * Renders editor panels via the module registry — no direct feature imports.
 */
export function VSEditorArea() {
    const { openTabs, activeTabId, confirmCloseTabId, setConfirmCloseTabId, editorAreaRef } = useEditorTabBarStore();
    const { closeTab, getActiveTab } = useEditorTabHelper();
    useOpenTabSync()

    const activeTab = getActiveTab();
    const keepAliveTabTypes = moduleRegistry.getKeepAliveTabTypes();

    const handleCloseTab = (event: React.MouseEvent, tabId: string) => {
        event.stopPropagation();
        closeTab(tabId);
    };

    const handleConfirmClose = () => {
        if (confirmCloseTabId) {
            closeTab(confirmCloseTabId, true);
            setConfirmCloseTabId(null);
        }
    };

    return (
        <div className="w-full h-full bg-editor-bg flex flex-col overflow-hidden">

            <TabBar />

            {activeTab && activeTab.type !== constants.vscode.tab.tabTypes.trackingGraph && (
                <EditorToolbar />
            )}

            <div id="mainContentArea" ref={editorAreaRef} className="flex-1 overflow-hidden flex">
                {/* Keep-alive panels: mounted but hidden when not active */}
                {openTabs
                    .filter((t) => keepAliveTabTypes.includes(t.type))
                    .map((t) => {
                        const Panel = moduleRegistry.getEditorPanel(t.type);
                        if (!Panel) return null;
                        return (
                            <div
                                key={t.id}
                                className="w-full h-full overflow-hidden"
                                style={{ display: t.id === activeTabId ? undefined : "none" }}
                            >
                                <Panel tab={t} />
                            </div>
                        );
                    })}

                {/* Active tab panel (skip keep-alive types — already rendered above) */}
                {activeTab && !keepAliveTabTypes.includes(activeTab.type) ? (
                    <ActivePanel tab={activeTab} />
                ) : !activeTab ? (
                    <WelcomeState />
                ) : null}
            </div>

            <ConfirmCloseDialog
                open={!!confirmCloseTabId}
                tabTitle={confirmCloseTabId ? activeTab?.title || "" : ""}
                onConfirm={handleConfirmClose}
                onCancel={() => setConfirmCloseTabId(null)}
            />
        </div>
    );
}

function ActivePanel({ tab }: { tab: BaseTab }) {
    const Panel = moduleRegistry.getEditorPanel(tab.type);
    if (!Panel) return <WelcomeState />;
    return <Panel tab={tab} />;
}

function WelcomeState() {
    return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/70">
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-1">Welcome to {constants.vscode.displayNames.notes}</h2>
                <p className="text-sm">Select a note from the sidebar to view its details</p>
            </div>
        </div>
    );
}
