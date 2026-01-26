/**
 * Note Detail Dialog Content Component
 * Modern card-based layout with ClickUp theme
 * Clean, organized design with shadcn/ui components
 */

import React, { useEffect, useRef } from "react";
import { GenericAutoComplete, GenericTagAutoComplete, GenericTextField, IAutoCompleteOptions } from "@/shared/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Note } from "../../types/note.types";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useEditorTabHelper, useNoteDetailHelper } from "@/hooks/index";
import { useEditorTabsStore, useGeneralStore, useWorkspaceStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { useTreeStatusHelper } from "@/hooks/workspace/useTreeStatusHelper";
import { MarkdownEditor } from "../Editor/MarkdownEditor";
import { MarkdownEditorSync } from "@/HeadlessComponents/markdownEditor/MarkdownEditorSync";
import { MarkdownEditorTheme } from "@/HeadlessComponents/markdownEditor/MarkdownEditorTheme";
import { useMonaco } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";

export function NoteDetailContent() {
    const { noteNameRef, shouldFocusNoteName, setShouldFocusNoteName, nameError, setNameError } = useNoteDetailStore();
    const { handleNoteFieldChange, handleHashTagsChange } = useNoteDetailHelper();
    const { activeTabId } = useEditorTabsStore();
    const { getActiveTab } = useEditorTabHelper();
    const activeTab = getActiveTab();
    const { getItemStatus } = useTreeStatusHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const _itemStatus = getItemStatus(currentWorkspace?.flatData?.find((i) => i.entityId === (activeTab?.data as Note)?.id && i.entityType === 3));
    const activeNote = activeTab?.type === constants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc, $miRef } = useNoteDetailStore();
    $miRef.current = useMonaco();

    // Get standard registry data from global state
    const { registries, registriesLoading, allKeywords } = useGeneralStore();

    // Check if note is deleted (soft deleted)
    let isDeleted = activeNote?.deletedAt !== null;
    let isHardDeleted = activeNote?.isHardDeleted;
    const isDisabled = isDeleted || isHardDeleted || _itemStatus.hasDeletedAncestor;

    const hashtagOptions = registries
        .filter((r) => r.type === constants.standardRegistryFE.types.hashtag && r.isActive)
        .map((item) => ({
            id: item.code,
            label: item.code,
            desc: item.description || item.code,
            active: item.isActive,
        }));

    // Get note status options from standard registry
    const noteStatusOptions = registries
        .filter((r) => r.type === constants.standardRegistryFE.types.noteStatus && r.isActive)
        .map((item) => ({
            id: item.code,
            label: item.description || item.code,
            desc: item.description || item.code,
            active: item.isActive,
        })) as IAutoCompleteOptions[];

    useEffect(() => {
        if (activeNote) {
            // Don't increment noteKey - let components sync via props instead
            // setNoteKey((prev) => prev + 1);
            setNameError(""); // Reset error khi chuyển note
        }
    }, [activeNote?.id]);

    // useEffect(() => {
    //     isDeleted = activeNote?.deletedAt !== null;
    //     isHardDeleted = activeTab?.data && (activeTab.data as Note).isHardDeleted;
    // }, [activeNote, openTabs]);

    // Focus vào Note Name field khi tạo note mới
    useEffect(() => {
        if (shouldFocusNoteName && noteNameRef.current) {
            setTimeout(() => {
                noteNameRef.current?.focus();
                setShouldFocusNoteName(false); // Reset flag sau khi focus
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
                {/* //* khi nào load đủ data thì mới render, không thì UI=loading, nếu không thì sẽ hiển thị sai*/}
                {$miRef.current && <MarkdownEditorSync />}
                {$miRef.current && displayDesc !== null && allKeywords && allKeywords.length > 0 && <MarkdownEditorTheme $mi={$miRef.current} />}
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
