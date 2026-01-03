/**
 * MarkdownEditor Component
 * Monaco-based editor with keyword highlighting and autocomplete
 */

import React, { useMemo, useState, useEffect } from "react";
import { useMonacoEditor } from "@/hooks/useMonacoEditor";
import { useStandardRegistryStore, useWorkspaceStore, useEditorTabsStore } from "@/store/index";
import { useKeywordNavigationHelper } from "@/hooks/keyword/useKeywordNavigation.helper";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useNoteDetailHelper } from "@/hooks/note/useNoteDetail.helper";
import { useTreeStatusHelper } from "@/hooks/workspace/useTreeStatusHelper";
import { constants } from "@/utils/constants";
import { convertToDisplayVersion, convertToOriginalVersion } from "@/utils/markdown.utils";
import { Note } from "@/types/note.types";


export function MarkdownEditor() {
    const { registries, allKeywords } = useStandardRegistryStore();
    const { navigateToKeyword } = useKeywordNavigationHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const { getActiveTab } = useEditorTabHelper();
    const { handleNoteFieldChange } = useNoteDetailHelper();
    const { getItemStatus } = useTreeStatusHelper();

    // Get active tab and note
    const activeTab = getActiveTab();
    const activeNote = activeTab?.type === constants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;
    const currentNoteId = activeNote?.id;
    
    // Check if note is disabled (deleted or has deleted ancestor)
    const _itemStatus = getItemStatus(
        currentWorkspace?.flatData?.find(
            (i) => i.entityId === activeNote?.id && i.entityType === 3
        )
    );
    const isDeleted = activeNote?.deletedAt !== null;
    const isHardDeleted = activeNote?.isHardDeleted;
    const disabled = isDeleted || isHardDeleted || _itemStatus.hasDeletedAncestor;
    
    // Get value from activeNote
    const value = activeNote?.description || "";

    // Internal state: Display version (clean text for editing)
    const [displayValue, setDisplayValue] = useState(() => convertToDisplayVersion(value));

    // Sync display version when external value changes
    useEffect(() => {
        const newDisplayValue = convertToDisplayVersion(value);
        setDisplayValue(newDisplayValue);
    }, [value]);

    // Handle internal changes: Update display and convert to original
    const handleDisplayChange = (newDisplayValue: string) => {
        setDisplayValue(newDisplayValue);

        // Convert display → original before updating note
        // Use allKeywords to map [name] to [[link]]
        const originalValue = convertToOriginalVersion(newDisplayValue, allKeywords);
        handleNoteFieldChange("description", originalValue);
    };

    // Extract keywords from registries + allKeywords
    const keywords = useMemo(() => {
        // Get hashtag and status keywords from registries
        const registryKeywords = registries
            .filter((r) => r.isActive && (r.type === constants.standardRegistryFE.types.hashtag || r.type === constants.standardRegistryFE.types.noteStatus))
            .map((r) => ({
                text: r.code,
                type: r.type === constants.standardRegistryFE.types.hashtag ? "hashtag" : "status",
            }));

        // Get keywords from allKeywords (workspaces, folders, notes, headings, external links)
        // Filter out deleted keywords if needed
        const systemKeywords = allKeywords
            .filter((k) => !k.isDeleted) // Only show non-deleted keywords
            .map((k) => ({
                text: k.name,
                type: k.type,
                // type: "comment", // Show all as comment type for now
            }));

        return [
            // ...registryKeywords,
            ...systemKeywords,
        ];
    }, [registries, allKeywords]);


    const { containerRef } = useMonacoEditor({
        initialValue: displayValue, // Use display version for editor
        onChange: handleDisplayChange, // Convert on change
        disabled,
        keywords,
        currentNoteId,
        allKeywords, // Pass all keywords for link resolution
        onKeywordClick: navigateToKeyword, // Handle keyword navigation
    });

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "400px",
                overflow: "hidden",
                textAlign: "left",
                backgroundColor: "#09090B",
                fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace",
            }}
            // className="bred"
        />
    );
}
