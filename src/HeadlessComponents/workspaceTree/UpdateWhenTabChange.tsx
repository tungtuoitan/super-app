import React, { useEffect, useMemo } from "react";
import { useEditorTabsStore, useWorkspaceStore } from "@/store/index";
import { isFolder as isFolderV2, isNote as isNoteV2, isFile as isFileV2, WorkspaceItemV2 } from "@/types/workspace-v2.types";
import { constants } from "@/utils/constants";
import { useEditorTabHelper } from "@/hooks/index";
import { TabType } from "@/components/Editor";


// When the active tab changes, update the selected item in the workspace tree accordingly
export function UpdateWhenTabChange() {
    const { isDragging, currentWorkspace, setSelectedItemIds, setLastSelectedItemId } = useWorkspaceStore();
    const { activeTabId } = useEditorTabsStore();
    const { getActiveTab } = useEditorTabHelper();

    useEffect(() => {
        const activeTab = getActiveTab();
        if (activeTab && ([constants.vscode.tab.tabTypes.note] as TabType[]).includes(activeTab.type)) {
            const noteId = activeTab.data.id;
            const item: WorkspaceItemV2 | undefined = currentWorkspace?.flatData.find((item) => item.entityType === 3 && item.entityId === noteId);
            if (item && item.id) {
                setSelectedItemIds([item.id]);
                setLastSelectedItemId(item.id);
            }
            else {
                setSelectedItemIds([]);
                setLastSelectedItemId(null);
            }
        }
    }, [activeTabId]);

    return null;
}
