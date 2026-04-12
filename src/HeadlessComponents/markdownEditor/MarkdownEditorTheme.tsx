/**
 * MarkdownEditor Component
 * Monaco-based editor with keyword highlighting and autocomplete
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useGeneralStore, useWorkspaceStore, useEditorTabsStore, useAuthStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { updateDecorations } from "@/utils/markdown.utils";
import "@/styles/keywords.css";
import { useNoteDetailStore } from "@/features/note/store/useNoteDetail.store";
import {Note} from "@/types/index";
import {useEditorTabHelper} from "@/hooks/vsCode/useEditorTab.helper";

export function MarkdownEditorTheme({ $mi }: { $mi: any }) {
    const { registries, allKeywords } = useGeneralStore();
    const { getActiveTab } = useEditorTabHelper();
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc } = useNoteDetailStore();
    const activeTab = getActiveTab();
    const activeNote = activeTab?.type === constants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;
    const currentNoteId = activeNote?.id;

    // Extract keywords from registries + allKeywords
    const _allKeywords = useMemo(() => {
        return allKeywords
            // Don't filter hardDeleted keywords - they should still be rendered/styled
            // But autocomplete will skip them
            .map((k) => ({
                // REMOVED: nameIndex no longer in keyword
                // text: `[${k.name}]${k.nameIndex}`,
                text: `[${k.name}]`,
                type: k.type,
                link: k.link,
                longLink: k.longLink,
                name: k.name,
                // nameIndex: k.nameIndex, // REMOVED
                hardDeletedAt: k.hardDeletedAt,
            }));
    }, [allKeywords]);

    // Define custom dark theme on monaco load
    useEffect(() => {
        if ($mi) {
            $mi.editor.defineTheme(constants.markdown.theme.name, constants.markdown.theme.config);
        } else {
            console.warn("⚠️ [THEME] Monaco instance not available yet");
        }
    }, [$mi]);

    //* Đây là best practice để listen content changes và update decorations *//
    // Listen to content changes and update decorations (best practice for Monaco)
    useEffect(() => {
        const editor = editorRef.current;
        const model = editor?.getModel();

        if (!editor || (editor as any)._isDisposed || !model) {
            return;
        }

        // Apply decorations immediately for current content
        try {
            const text = model.getValue();
            updateDecorations(editor, text, _allKeywords, decorationsRef);
        } catch (error) {
            console.warn("[Monaco] Initial decoration error", error);
        }

        //* khi content thay đổi, hàm onDidChangeContent sẽ được gọi ngay.
        // Listen to model content changes (user edits, tab switches, etc.)
        const disposable = model.onDidChangeContent(() => {
            try {
                const text = model.getValue(); // Always up-to-date
                updateDecorations(editor, text, _allKeywords, decorationsRef);
            } catch (error) {
                console.warn("[Monaco] Decoration update error", error);
            }
        });

        return () => disposable.dispose();
    }, [_allKeywords, currentNoteId, activeNote?.description]); // Re-setup listener when keywords change

    return null;
}
