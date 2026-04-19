/**
 * Note Detail Dialog Content Component
 */

import React, { useEffect } from "react";
import { GenericAutoComplete, GenericTagAutoComplete, GenericTextField, IAutoCompleteOptions } from "@/shared/components";
import { CardContent } from "@/shared/components/ui/card";
import { Note } from "../types/note.types";
import { useNoteDetailStore } from "../store/useNoteDetail.store";
import { useNoteDetailHelper } from "../hooks/useNoteDetail.helper";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { useEditorTabsStore, useGeneralStore } from "@/store/index";
import { useWorkspaceStore } from "@/features/workspace/store/Workspace.store";
import { constants } from "@/utils/constants";
import { useTreeStatusHelper } from "@/features/workspace/hooks/useTreeStatusHelper";
import { MarkdownEditor } from "@/features/note/Components/MarkdownEditor";
import { MarkdownEditorSync } from "../HeadlessComponents/MarkdownEditorSync";
import { MarkdownEditorTheme } from "../HeadlessComponents/MarkdownEditorTheme";
import { useMonaco } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";

export function NoteDetailContent() {
    const { noteNameRef, shouldFocusNoteName, setShouldFocusNoteName, nameError, setNameError } = useNoteDetailStore();
    const { getActiveTab } = useEditorTabHelper();
    const activeTab = getActiveTab();
    const { getItemStatus } = useTreeStatusHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const _itemStatus = getItemStatus(currentWorkspace?.flatData?.find((i) => i.entityId === (activeTab?.data as Note)?.id && i.entityType === 3));
    const activeNote = activeTab?.type === constants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc, $miRef } = useNoteDetailStore();
    $miRef.current = useMonaco();

    const { registries, registriesLoading, allKeywords } = useGeneralStore();

    // let isDeleted = activeNote?.deletedAt !== null;
    // let isHardDeleted = activeNote?.isHardDeleted;
    // const isDisabled = isDeleted || isHardDeleted || _itemStatus.hasDeletedAncestor;

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
                {$miRef.current && <MarkdownEditorSync />}
                {/* {$miRef.current && displayDesc !== null && allKeywords && allKeywords.length > 0 && <MarkdownEditorTheme $mi={$miRef.current} />} */}
                {displayDesc !== null && allKeywords && allKeywords.length > 0 ? (
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
