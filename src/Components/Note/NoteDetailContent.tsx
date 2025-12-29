/**
 * Note Detail Dialog Content Component
 * Modern card-based layout with ClickUp theme
 * Clean, organized design with shadcn/ui components
 */

import React, { useEffect, useRef } from "react";
import { GenericAutoComplete, GenericTagAutoComplete, GenericTextField, IAutoCompleteOptions } from "@/shared/components";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Textarea } from "@/Components/ui/textarea";
import { Note } from "../../types/note.types";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { formatNoteDate } from "@/utils/note.utils";
import { useEditorTabHelper, useNoteDetailHelper } from "@/hooks/index";
import { useEditorTabsStore, useStandardRegistryStore, useWorkspaceStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { useNavigationHistoryHelper } from "@/hooks/vsCode/useNavigationHistory.helper";
import {useTreeStatusHelper} from "@/hooks/workspace/useTreeStatusHelper";

export function NoteDetailContent() {
    const { noteNameRef, shouldFocusNoteName, setShouldFocusNoteName, nameError, setNameError } = useNoteDetailStore();
    const { handleNoteFieldChange, handleHashTagsChange } = useNoteDetailHelper();
    const { activeTabId } = useEditorTabsStore();
    const { getActiveTab } = useEditorTabHelper();
    const [noteKey, setNoteKey] = React.useState(0);
    const activeTab = getActiveTab();
    const { trackNavigation } = useNavigationHistoryHelper();
    const {getItemStatus} = useTreeStatusHelper()
    const { currentWorkspace} = useWorkspaceStore();
    const _itemStatus = getItemStatus(currentWorkspace?.flatData?.find(i => i.entityId === (activeTab?.data as Note)?.id && i.entityType === 3));
    console.log('_itemStatus', _itemStatus);
    // Get note data from active tab instead of activeNote
    const activeNote = activeTab?.type === constants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;

    // Get standard registry data from global state
    const { registries, registriesLoading } = useStandardRegistryStore();

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
            setNoteKey((prev) => prev + 1);
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

    // Convert hashtags array to comma-separated string of IDs for TagAutoComplete
    // Map selected hashtags to match the format expected by the component (comma-separated string of IDs)
    // const currentHashTagsValue = activeNote?.hashtags
    //     ? activeNote.hashtags
    //           .map((hashtag: any) => hashtag.id.toString())
    //           .filter(Boolean)
    //           .join(",")
    //     : "";

    if (!activeNote) {
        return null;
    }



    return (
        <div key={noteKey} className="p-6 space-y-6 h-full ">
            {/* Full Width - Description */}
            <div className="border-none">
                <CardContent className="p-0">
                    <Textarea
                        id="note-description-field"
                        name="note-description"
                        value={activeNote?.description || ""}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            handleNoteFieldChange("description", newValue);
                        }}
                        onFocus={() => trackNavigation("description")}
                        placeholder="Enter note description..."
                        className="min-h-[400px] resize-none font-mono text-sm overscroll-behavior-y-contain"
                        disabled={isDisabled}
                    />
                </CardContent>
            </div>

            {/* Two Column Layout - Details and Metadata */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                {/* Right Column - Metadata */}
                <div className="border-none">
                    <CardContent className="p-0 space-y-4">
                        <GenericTextField label="Created" value={formatNoteDate(activeNote?.createdAt)} disabled size="small" />

                        <GenericTextField label="Updated" value={formatNoteDate(activeNote?.updatedAt)} disabled size="small" />

                        <GenericTextField label="Created by" value={activeNote?.createdBy || "-"} disabled size="small" />
                    </CardContent>
                </div>
            </div>
        </div>
    );
}
