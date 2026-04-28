/**
 * MarkdownEditor Component
 * Monaco-based editor with keyword highlighting and autocomplete
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { constants } from "@/utils/constants";
import { convertToDisplayVersion, updateDecorations } from "@/utils/markdown.utils";
import { Note } from "@/features/note/types/note.types";
import "@/styles/keywords.css";
import { useNoteDetailStore } from "@/features/note/store/useNoteDetail.store";
import {useGeneralStore} from "@/shared/store/General.store";

export function useMarkdownEditorSync({$mi}: { $mi: any }) {
    const { getActiveTab, openTab } = useEditorTabHelper();
    const { allKeywords } = useGeneralStore(); 
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc } = useNoteDetailStore();

    // Get active tab and note
    const activeTab = getActiveTab();
    const activeNote = activeTab?.type === constants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;

    // Track previous note ID to detect tab switches
    const prevNoteIdRef = useRef<number | null>(null);

    // const _allKeywords = allKeywords.map((k) => ({
    //         // REMOVED: nameIndex no longer in keyword
    //         // text: `[${k.name}]${k.nameIndex}`,
    //         text: `[${k.name}]`,
    //         type: k.type,
    //         link: k.link,
    //         longLink: k.longLink,
    //         name: k.name,
    //         // nameIndex: k.nameIndex, // REMOVED
    //         hardDeletedAt: k.hardDeletedAt,
    //     }))

    // Sync when external activeNote.description changes - convert [id] to [name][nameIndex]
    useEffect(() => {
        if (!$mi) return;
        const keywordIds = [...(activeNote?.description??"").matchAll(/\[\[(.*?)\]\]/g)].map(m => m[1]);
        if(keywordIds.some(id => !allKeywords.find(kw => kw.id.toString() === id))){
            console.warn("Some keyword IDs not found in allKeywords");
            return;
        }
        
        const displayValue = convertToDisplayVersion(activeNote?.description || "", allKeywords);
        // setDisplayDesc(_ => {
        //     if (editorRef.current) {
        //         updateDecorations(editorRef.current, displayValue ?? "", _allKeywords, decorationsRef);
        //     }
        //     return displayValue ?? null
        // });
        setDisplayDesc(displayValue ?? null);
        
    }, [activeNote?.description, allKeywords, $mi]);

    // useEffect(() => {
    //     // console.log("displayDesc:", displayDesc);
    // }, [displayDesc]);

    // Sync external value changes to editor (only when editor doesn't have focus)
    useEffect(() => {
        if (!$mi) return;
        const editor = editorRef.current;

        if (!editor || (editor as any)._isDisposed) {
            return;
        }

        // Check if this is a tab switch (different note ID)
        // prevNoteIdRef.current === null means first mount (coming from non-note tab) — treat as tab switch
        const isTabSwitch = prevNoteIdRef.current !== activeNote?.id;
        prevNoteIdRef.current = activeNote?.id ?? null;

        try {
            const currentValue = editor.getValue();

            // Only sync if value changed AND editor doesn't have focus
            // This prevents flicker when user is actively editing
            if (currentValue !== displayDesc && !editor.hasTextFocus()) {
                // Capture current position AND scroll before setValue
                const currentPosition = editor.getPosition();
                const currentScrollTop = editor.getScrollTop();
                const currentScrollLeft = editor.getScrollLeft();

                editor.setValue(displayDesc??"");

                if (!isTabSwitch) {
                    // Restore cursor position if possible
                    if (currentPosition) {
                        editor.setPosition(currentPosition);
                    }
                    // Restore scroll position (CRITICAL: setValue resets scroll to 0)
                    editor.setScrollPosition({
                        scrollTop: currentScrollTop,
                        scrollLeft: currentScrollLeft,
                    }, 1); // ScrollType.Immediate
                } else {
                    // Tab switch: restore saved scroll position from viewState immediately after setValue
                    const savedScroll = activeTab?.viewState?.editorScrollPosition;
                    if (savedScroll) {
                        editor.setScrollPosition({
                            scrollTop: savedScroll.scrollTop,
                            scrollLeft: savedScroll.scrollLeft,
                        }, 1);
                    }
                }
            }
        } catch (error) {
            console.warn("[Monaco] Value sync error (editor may be disposed):", error);
        }
    }, [displayDesc, activeNote?.id, $mi]);

    return null;
}
