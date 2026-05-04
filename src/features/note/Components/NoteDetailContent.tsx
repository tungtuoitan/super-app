/**
 * Note Detail Dialog Content Component
 */

import React, { useEffect } from "react";
import { shellConstants } from "@/shell";
import { CardContent } from "@/shared";
import { Note } from "../types/note.types";
import { useNoteDetailStore } from "../store/useNoteDetail.store";
import { useEditorTabBarHelper } from "@/shell";
import { constants } from "@/shared";
import { MarkdownEditor } from "@/features/note/Components/MarkdownEditor";
import { useMonaco } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";
import {useMarkdownEditorTheme} from "../hooks/useMarkdownEditorTheme";
import {useMarkdownEditorSync} from "../hooks/useMarkdownEditorSync";

export function NoteDetailContent() {
    const { noteNameRef, shouldFocusNoteName, setShouldFocusNoteName, nameError, setNameError } = useNoteDetailStore();
    const { getActiveTab } = useEditorTabBarHelper();
    const activeTab = getActiveTab();
    const activeNote = activeTab?.type === shellConstants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc, $miRef } = useNoteDetailStore();
    $miRef.current = useMonaco();
    useMarkdownEditorTheme({$mi: $miRef.current});
    useMarkdownEditorSync({$mi: $miRef.current});

    
    useEffect(() => {
        if (activeNote) {
            setNameError("");
        }
    }, [activeNote?.id]);

    useEffect(() => {
        if (shouldFocusNoteName && noteNameRef.current) {
            setTimeout(() => {
                noteNameRef.current?.focus();
                setShouldFocusNoteName(false);
            }, 100);
        }
    }, [shouldFocusNoteName, noteNameRef]);

    if (!activeNote) {
        console.log("[NoteDetailContent] No activeNote, returning null");
        return null;
    }
    return (
        <div className="h-full">
            <CardContent className="p-0 h-full">
                {displayDesc !== null ? (
                    <MarkdownEditor />
                ) : (
                    <div className="w-full h-full flex justify-center items-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                )}
            </CardContent>
        </div>
    );
}


