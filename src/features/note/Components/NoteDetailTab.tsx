/**
 * Note Detail Tab Component
 */

import React, { useEffect } from "react";
import { GenericAutoComplete, GenericTextField, IAutoCompleteOptions, IconPicker } from "@/shared/components";
import { CardContent } from "@/Components/ui/card";
import { Note } from "../types/note.types";
import { useNoteDetailStore } from "../store/useNoteDetail.store";
import { useNoteDetailHelper } from "../hooks/useNoteDetail.helper";
import { formatNoteDate } from "../utils/note.utils";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useEditorTabsStore, useGeneralStore, useWorkspaceStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { useTreeStatusHelper } from "@/hooks/workspace/useTreeStatusHelper";
import { MarkdownEditor } from "@/Components/Editor/MarkdownEditor";
import { MarkdownEditorSync } from "@/HeadlessComponents/markdownEditor/MarkdownEditorSync";
import { MarkdownEditorTheme } from "@/HeadlessComponents/markdownEditor/MarkdownEditorTheme";
import { useMonaco } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";
import { IconType } from "@/shared/icons";

export function NoteDetailTab() {
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

    const { registries, registriesLoading, allKeywords } = useGeneralStore();

    let isDeleted = activeNote?.deletedAt !== null;
    let isHardDeleted = activeNote?.isHardDeleted;
    const isDisabled = isDeleted || isHardDeleted || _itemStatus.hasDeletedAncestor;

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
        <div className="py-6 space-y-6 h-full ">
            <div className="px-6 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Left Column - Note Details */}
                <div className="border-none">
                    <CardContent className="p-0 space-y-2">
                        <GenericTextField
                            ref={noteNameRef}
                            id="note-name-field"
                            name="note-name"
                            label="Note Name"
                            value={activeNote?.name || ""}
                            onChange={(e) => {
                                handleNoteFieldChange("name", e.target.value);
                                if (e.target.value && e.target.value.trim() !== "") setNameError("");
                                else setNameError("Note Name is required");
                            }}
                            size="small"
                            disabled={isDisabled}
                            error={!!nameError}
                            helperText={nameError}
                        />

                        <div className="space-y-2">
                            <GenericAutoComplete
                                allOptions={noteStatusOptions}
                                value={noteStatusOptions.find((option) => option.id === activeNote?.statusCode) || null}
                                onChange={(value) => handleNoteFieldChange("statusCode", value)}
                                inputProps={{
                                    name: "status",
                                    label: "Status",
                                }}
                                size="small"
                                disabled={isDisabled || registriesLoading}
                            />
                        </div>
                    </CardContent>
                </div>

                {/* Right Column - Metadata & Icon */}
                <div className="border-none">
                    <CardContent className="p-0 space-y-4">
                        <GenericTextField label="Created" value={formatNoteDate(activeNote?.createdAt)} disabled size="small" />

                        <GenericTextField label="Updated" value={formatNoteDate(activeNote?.updatedAt)} disabled size="small" />

                        <GenericTextField label="Created by" value={activeNote?.createdBy || "-"} disabled size="small" />

                        <IconPicker
                            value={(activeNote?.icon as IconType) || null}
                            onChange={(iconType, defaultColor) => {
                                handleNoteFieldChange("icon", {iconType, defaultColor});
                            }}
                            label="Icon"
                            columns={4}
                            maxHeight="200px"
                            height="150px"
                            showDefaultOption={true}
                            defaultOptionLabel="Default (Note)"
                            defaultIconType={IconType.NOTE}
                            showGroupLabels={true}
                            disabled={isDisabled}
                        />
                    </CardContent>
                </div>
            </div>
        </div>
    );
}
