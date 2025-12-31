import React from "react";
import { X, FileText, Folder } from "lucide-react";
import { constants } from "@/utils/constants";
import { useEditorTabsStore } from "@/store/index";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";

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
 * TabBar - VS Code style tab bar component
 */
export function TabBar() {
    const { openTabs, activeTabId, isLoadingTabs } = useEditorTabsStore();
    const { closeTab, updateActiveTab } = useEditorTabHelper();

    const handleCloseTab = (event: React.MouseEvent, tabId: string) => {
        event.stopPropagation();
        closeTab(tabId);
    };

    return (
        <div className="min-h-[35px] flex items-start border-b border-editor-border bg-editor-sidebar">
            {isLoadingTabs ? (
                <div className="px-4 w-full h-[35px] flex items-center gap-2">
                    <div className="h-4 w-24 bg-muted/20 animate-pulse rounded"></div>
                    <div className="h-4 w-32 bg-muted/20 animate-pulse rounded"></div>
                    <div className="h-4 w-20 bg-muted/20 animate-pulse rounded"></div>
                </div>
            ) : openTabs.length > 0 ? (
                <div className="flex-1 flex flex-wrap">
                    {openTabs.map((tab) => {
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
    );
}