/**
 * MarkdownEditor Component
 * Monaco-based editor with keyword highlighting and autocomplete
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useGeneralStore, useWorkspaceStore, useEditorTabsStore, useAuthStore } from "@/store/index";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { constants } from "@/utils/constants";
import { updateDecorations } from "@/utils/markdown.utils";
import { Note } from "@/types/note.types";
import "@/styles/keywords.css";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";

export function MarkdownEditorTheme({ $mi }: { $mi: any }) {
    const { registries, allKeywords } = useGeneralStore();
    const { getActiveTab, openTab } = useEditorTabHelper();
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc } = useNoteDetailStore();

    // Get active tab and note
    const activeTab = getActiveTab();
    const activeNote = activeTab?.type === constants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;
    const currentNoteId = activeNote?.id;

    // Extract keywords from registries + allKeywords
    const _allKeywords = useMemo(() => {
        return allKeywords.map((k) => ({
            // Format: [name] for nameIndex=1, [name][nameIndex] for others
            text: k.nameIndex === 1 ? `[${k.name}]` : `[${k.name}][${k.nameIndex}]`,
            type: k.type,
            link: k.link,
            longLink: k.longLink,
            name: k.name,
            nameIndex: k.nameIndex,
        }));
    }, [allKeywords]);

    // Define custom dark theme on monaco load
    useEffect(() => {
        if ($mi) {
            $mi.editor.defineTheme(constants.markdown.theme.name, constants.markdown.theme.config);
        }
    }, [$mi]);

    // Update decorations when keywords or content change
    useEffect(() => {
        const editor = editorRef.current;

        if (!editor || (editor as any)._isDisposed) {
            return;
        }

        try {
            const value = editor.getValue();

            // Only decorate keywords, NOT headings
            // Headings should not have underlines or be clickable
            updateDecorations(editor, value, _allKeywords, decorationsRef);
        } catch (error) {
            console.warn("[Monaco] Update decorations error (editor may be disposed)");
        }
    }, [_allKeywords, currentNoteId]);

    return null;
}
