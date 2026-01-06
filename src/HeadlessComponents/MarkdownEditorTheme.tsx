/**
 * MarkdownEditor Component
 * Monaco-based editor with keyword highlighting and autocomplete
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useStandardRegistryStore, useWorkspaceStore, useEditorTabsStore, useAuthStore } from "@/store/index";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { constants } from "@/utils/constants";
import { updateDecorations, extractHeadingsAsKeywords } from "@/utils/markdown.utils";
import { Note } from "@/types/note.types";
import "@/styles/keywords.css";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";

export function MarkdownEditorTheme({ $mi }: { $mi: any }) {
    const { registries, allKeywords } = useStandardRegistryStore();
    const { getActiveTab, openTab } = useEditorTabHelper();
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc } = useNoteDetailStore();

    // Get active tab and note
    const activeTab = getActiveTab();
    const activeNote = activeTab?.type === constants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;
    const currentNoteId = activeNote?.id;

    // Extract keywords from registries + allKeywords
    const _allKeywords = useMemo(() => {
        return allKeywords.map((k) => ({
            text: k.name,
            type: k.type,
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

            // Extract headings from current text and merge with keywords
            const headings = extractHeadingsAsKeywords(value, currentNoteId);
            const mergedKeywords = [..._allKeywords, ...headings];

            updateDecorations(editor, value, mergedKeywords, decorationsRef);
        } catch (error) {
            console.warn("[Monaco] Update decorations error (editor may be disposed)");
        }
    }, [_allKeywords, currentNoteId]);

    return null;
}
