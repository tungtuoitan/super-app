/**
 * Note Detail Tab Component
 */

import React, { useEffect } from "react";
import { GenericAutoComplete, GenericTextField, IAutoCompleteOptions, IconPicker, standardRegistryConstants, useGetStandardRegistry } from "@/shared";
import { CardContent } from "@/shared";
import { Note } from "../types/note.types";
import { useNoteDetailStore } from "../store/useNoteDetail.store";
import { useNoteDetailHelper } from "../hooks/useNoteDetail.helper";
import { formatNoteDate } from "../utils/note.utils";
import { useEditorTabBarHelper } from "@/shell";
import { useWorkspaceStore } from "@/features/workspace";
import { useTreeStatusHelper } from "@/features/workspace";
import { useMonaco } from "@monaco-editor/react";
import { IconKey } from "@/shared";
import {useStandardRegistrySelector} from "@/shared";
import {shellConstants} from "@/shell";

export function NoteBodyInPanel() {
    const { noteNameRef, shouldFocusNoteName, setShouldFocusNoteName, nameError, setNameError } = useNoteDetailStore();
    const { handleNoteFieldChange, handleHashTagsChange } = useNoteDetailHelper();
    const { getActiveTab } = useEditorTabBarHelper();
    const activeTab = getActiveTab();
    const { getItemStatus } = useTreeStatusHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const _itemStatus = getItemStatus(currentWorkspace?.flatData?.find((i) => i.entityId === (activeTab?.data as Note)?.id && i.entityType === 3));
    const activeNote = activeTab?.type === shellConstants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc, $miRef } = useNoteDetailStore();
    $miRef.current = useMonaco();

    const noteStatus = useGetStandardRegistry(standardRegistryConstants.types.noteStatus);
    const { registriesLoading } = useStandardRegistrySelector();

    let isDeleted = activeNote?.deletedAt !== null;
    let isHardDeleted = activeNote?.isHardDeleted;
    const isDisabled = isDeleted || isHardDeleted || _itemStatus.hasDeletedAncestor;

    const noteStatusOptions = noteStatus
        .filter((r:any) => r.isActive)
        .map((item:any) => ({
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
                            value={(activeNote?.icon as IconKey) || null}
                            onChange={(iconType, defaultColor) => {
                                handleNoteFieldChange("icon", {iconType, defaultColor});
                            }}
                            label="Icon"
                            columns={4}
                            maxHeight="200px"
                            height="150px"
                            showDefaultOption={true}
                            defaultOptionLabel="Default (Note)"
                            defaultIconKey={IconKey.NOTE}
                            showGroupLabels={true}
                            disabled={isDisabled}
                        />
                    </CardContent>
                </div>
            </div>
        </div>
    );
}

