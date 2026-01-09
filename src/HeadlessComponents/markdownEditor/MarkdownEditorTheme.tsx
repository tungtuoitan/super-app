/**
 * MarkdownEditor Component
 * Monaco-based editor with keyword highlighting and autocomplete
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useGeneralStore, useWorkspaceStore, useEditorTabsStore, useAuthStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { updateDecorations } from "@/utils/markdown.utils";
import "@/styles/keywords.css";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";

export function MarkdownEditorTheme({ $mi }: { $mi: any }) {
    const { registries, allKeywords } = useGeneralStore();
    const { activeTabId } = useEditorTabsStore();
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc } = useNoteDetailStore();

    // Extract keywords from registries + allKeywords
    const _allKeywords = useMemo(() => {
        return allKeywords
            // Don't filter hardDeleted keywords - they should still be rendered/styled
            // But autocomplete will skip them
            .map((k) => ({
                // New format: [name]nameIndex (always show nameIndex, even if it's 1)
                text: `[${k.name}]${k.nameIndex}`,
                type: k.type,
                link: k.link,
                longLink: k.longLink,
                name: k.name,
                nameIndex: k.nameIndex,
                hardDeletedAt: k.hardDeletedAt, // Pass through for autocomplete filtering
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
        updateDecorations(editor, editor.getValue(), _allKeywords, decorationsRef);
    }, [_allKeywords, displayDesc, activeTabId]); // Removed displayDesc dependency!

    return null;
}
