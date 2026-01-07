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
        return allKeywords
            // .filter((k) => k.hardDeletedAt === null)
            .map((k) => ({
                // Format: [name] for nameIndex=1, [name][nameIndex] for others
                text: `[${k.name}][${k.nameIndex}]`,
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
        } else {
            console.warn("⚠️ [THEME] Monaco instance not available yet");
        }
    }, [$mi]);

    // Update decorations when keywords change or note changes
    useEffect(() => {
        const editor = editorRef.current;

        if (!editor) {
            console.warn("⚠️ [THEME] No editor instance found");
            return;
        }

        if ((editor as any)._isDisposed) {
            console.warn("⚠️ [THEME] Editor is disposed, skipping decoration update");
            return;
        }

        // Debounce timer for decoration updates (to prevent flickering during Unikey composition)
        // let debounceTimer: NodeJS.Timeout | null = null;

        // Function to update decorations
        const performDecorationUpdate = () => {
            try {
                const value = editor.getValue();

                // Only decorate keywords, NOT headings
                // Headings should not have underlines or be clickable
                updateDecorations(editor, value, _allKeywords, decorationsRef);
            } catch (error) {
                console.error("❌ [THEME] Update decorations error:", error);
                console.warn("[Monaco] Update decorations error (editor may be disposed)");
            }
        };

        // Initial decoration update (no debounce)
        performDecorationUpdate();

        // Listen to editor content changes with debounce to prevent flickering
        // const contentChangeDisposable = editor.onDidChangeModelContent(() => {
        //     // Clear previous timer
        //     if (debounceTimer) {
        //         clearTimeout(debounceTimer);
        //     }

        //     // Schedule new update after 100ms (allows Unikey composition to complete)
        //     debounceTimer = setTimeout(() => {
        //         performDecorationUpdate();
        //         debounceTimer = null;
        //     }, 100);
        // });

        // Cleanup
        // return () => {
        //     if (debounceTimer) {
        //         clearTimeout(debounceTimer);
        //     }
        //     contentChangeDisposable.dispose();
        // };
    }, [_allKeywords, currentNoteId]); // Removed displayDesc dependency!

    return null;
}
