/**
 * MarkdownEditor Component
 * Monaco-based editor with keyword highlighting and autocomplete
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useGeneralStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { convertToDisplayVersion, updateDecorations } from "@/utils/markdown.utils";
import { Note } from "@/types/note.types";
import "@/styles/keywords.css";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";

export function MarkdownEditorSync() {
    const { getActiveTab, openTab } = useEditorTabHelper();
    const { allKeywords } = useGeneralStore();
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc } = useNoteDetailStore();

    // Get active tab and note
    const activeTab = getActiveTab();
    const activeNote = activeTab?.type === constants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;

    const _allKeywords = allKeywords.map((k) => ({
            // New format: [name]nameIndex (always show nameIndex, even if it's 1)
            text: `[${k.name}]${k.nameIndex}`,
            type: k.type,
            link: k.link,
            longLink: k.longLink,
            name: k.name,
            nameIndex: k.nameIndex,
            hardDeletedAt: k.hardDeletedAt, // Pass through for autocomplete filtering
        }))

    // Sync when external activeNote.description changes - convert [id] to [name][nameIndex]
    useEffect(() => {
        const keywordIds = [...(activeNote?.description??"").matchAll(/\[\[(.*?)\]\]/g)].map(m => m[1]);
        if(keywordIds.some(id => !allKeywords.find(kw => kw.id.toString() === id))){
            console.warn("Some keyword IDs not found in allKeywords");
            return;
        }
        
        const displayValue = convertToDisplayVersion(activeNote?.description || "", allKeywords);
        if (editorRef.current) {
            updateDecorations(editorRef.current, displayValue ?? "", _allKeywords, decorationsRef);
        }
        setDisplayDesc(displayValue ?? null);
        
    }, [activeNote?.description, allKeywords]);

    useEffect(() => {
        // console.log("displayDesc:", displayDesc);
    }, [displayDesc]);

    // Sync external value changes to editor (only when editor doesn't have focus)
    useEffect(() => {
        const editor = editorRef.current;

        if (!editor || (editor as any)._isDisposed) {
            return;
        }

        try {
            const currentValue = editor.getValue();

            // Only sync if value changed AND editor doesn't have focus
            // This prevents flicker when user is actively editing
            if (currentValue !== displayDesc && !editor.hasTextFocus()) {
                const currentPosition = editor.getPosition();
                editor.setValue(displayDesc??"");
                // Restore cursor position if possible
                if (currentPosition) {
                    editor.setPosition(currentPosition);
                }
            }
        } catch (error) {
            console.warn("[Monaco] Value sync error (editor may be disposed):", error);
        }
    }, [displayDesc]);

    return null;
}
