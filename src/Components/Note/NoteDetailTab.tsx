/**
 * Note Detail Dialog Content Component
 * Modern card-based layout with ClickUp theme
 * Clean, organized design with shadcn/ui components
 */

import React, { useEffect, useRef } from "react";
import { GenericAutoComplete, GenericTagAutoComplete, GenericTextField, IAutoCompleteOptions, IconPicker } from "@/shared/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Note } from "../../types/note.types";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { formatNoteDate } from "@/utils/note.utils";
import { useEditorTabHelper, useNoteDetailHelper } from "@/hooks/index";
import { useEditorTabsStore, useGeneralStore, useWorkspaceStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { useNavigationHistoryHelper } from "@/hooks/vsCode/useNavigationHistory.helper";
import { useTreeStatusHelper } from "@/hooks/workspace/useTreeStatusHelper";
import { MarkdownEditor } from "../Editor/MarkdownEditor";
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
        <div className="py-6 space-y-6 h-full ">
            <div className="px-6 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Left Column - Note Details */}
                <div className="border-none">
                    <CardContent className="p-0 space-y-2">
                        {/* Note Name */}
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

                        {/* Status */}
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

                        {/* HashTags */}
                        {/* <div className="space-y-2">
                            <GenericTagAutoComplete
                                options={hashtagOptions as unknown as IAutoCompleteOptions[]}
                                value={currentHashTagsValue}
                                onChange={handleHashTagsChange}
                                label="HashTags"
                                placeholder={registriesLoading ? "Loading hashtags..." : "+ Add HashTag"}
                                size="small"
                                data-testid="note-tags"
                                disabled={isDeleted || isHardDeleted || registriesLoading}
                            />
                        </div> */}
                    </CardContent>
                </div>

                {/* Right Column - Metadata & Icon */}
                <div className="border-none">
                    <CardContent className="p-0 space-y-4">
                        <GenericTextField label="Created" value={formatNoteDate(activeNote?.createdAt)} disabled size="small" />

                        <GenericTextField label="Updated" value={formatNoteDate(activeNote?.updatedAt)} disabled size="small" />

                        <GenericTextField label="Created by" value={activeNote?.createdBy || "-"} disabled size="small" />

                        {/* Icon Picker */}
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
