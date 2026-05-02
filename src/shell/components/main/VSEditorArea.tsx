import React from "react";
import { useTabBarSync } from "../../hooks/useTabBarSync";
import { TabBar } from "./TabBar";
import { EditorToolbar } from "./EditorToolbar";
import { ConfirmCloseDialog } from "../ConfirmCloseDialog";
import { useEditorTabBarHelper } from "@/shell/hooks/useEditorTabBar.helper";
import { useEditorTabBarStore } from "@/shell/store/EditorTab.store";
import { moduleRegistry } from "@/shell/moduleRegistry";
import { shellConstants } from "@/shell/shell.constants";
import { BaseTab } from "@/shell/types/tab.types";
import { ErrorBoundary, EditorAreaErrorFallback, TabPanelErrorFallback } from "@/shared";

/**
 * VSEditorArea - main editor area.
 * Renders editor panels via the module registry - no direct feature imports.
 */
export function VSEditorArea() {
    const { openTabs, activeTabId, confirmCloseTabId, setConfirmCloseTabId, editorAreaRef } = useEditorTabBarStore();
    const { closeTab, getActiveTab } = useEditorTabBarHelper();
    useTabBarSync();

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
        <ErrorBoundary FallbackComponent={EditorAreaErrorFallback}>
            <div className="w-full h-full bg-editor-bg flex flex-col overflow-hidden">

                <TabBar />

                {activeTab && activeTab.type !== shellConstants.vscode.tab.tabTypes.trackingGraph && (
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
                                <ErrorBoundary
                                    key={t.id}
                                    FallbackComponent={TabPanelErrorFallback}
                                    resetKeys={[t.id]}
                                >
                                    <div
                                        className="w-full h-full overflow-hidden"
                                        style={{ display: t.id === activeTabId ? undefined : "none" }}
                                    >
                                        <Panel tab={t} />
                                    </div>
                                </ErrorBoundary>
                            );
                        })}

                    {/* Active tab panel (skip keep-alive types - already rendered above) */}
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
        </ErrorBoundary>
    );
}

function ActivePanel({ tab }: { tab: BaseTab }) {
    const Panel = moduleRegistry.getEditorPanel(tab.type);
    if (!Panel) return <WelcomeState />;
    return (
        <ErrorBoundary FallbackComponent={TabPanelErrorFallback} resetKeys={[tab.id]}>
            <Panel tab={tab} />
        </ErrorBoundary>
    );
}

function WelcomeState() {
    return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/70">
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-1">Welcome to {"Notes"}</h2>
                <p className="text-sm">Select a note from the sidebar to view its details</p>
            </div>
        </div>
    );
}
