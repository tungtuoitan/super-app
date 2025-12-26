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
import { useEditorTabsStore } from "@/store/index";
import { constants } from "@/utils/constants";

export function NoteDetailContent() {
    const { noteNameRef, shouldFocusNoteName, setShouldFocusNoteName } = useNoteDetailStore();
    const { selectedNote } = useNoteGridStore();
    const { handleNoteFieldChange } = useNoteDetailHelper();
    const { activeTabId } = useEditorTabsStore();
    const { getTabById } = useEditorTabHelper();
    const [noteKey, setNoteKey] = React.useState(0);
    const activeTab = activeTabId ? getTabById(activeTabId) : null;

    useEffect(() => {
        if (selectedNote) {
            setNoteKey((prev) => prev + 1);
        }
    }, [selectedNote?.id]);

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
    const currentTagsValue = selectedNote?.tags
        ? selectedNote.tags
              .map((tag: any) => tag.tagId.toString())
              .filter(Boolean)
              .join(",")
        : "";

    const handleTagsChange = (tagsString: string) => {
        // Convert comma-separated string of IDs back to hashtags array
        const tagIds = tagsString
            ? tagsString
                  .split(",")
                  .map((id) => id.trim())
                  .filter((id) => id)
            : [];

        // Convert hashtag IDs to Tag objects by finding them in the options
        const tagObjects = tagIds
            .map((tagId) => {
                const foundOption = constants.standardRegistryFE.fallbackTagOptions.find((option: IAutoCompleteOptions) => option.id === tagId);
                if (foundOption) {
                    return {
                        tagId: parseInt(foundOption.id as string),
                        name: foundOption.label,
                        description: foundOption.desc,
                        isActive: foundOption.active,
                        createdAt: new Date(),
                        id: parseInt(foundOption.id as string), // Add alias for backward compatibility
                    };
                }
                return null;
            })
            .filter((tag) => tag !== null);

        handleNoteFieldChange("tags", tagObjects);
    };

    if (!selectedNote) {
        return null;
    }

    // Check if note is deleted (soft deleted)
    const isDeleted = selectedNote?.deletedAt !== null;
    const isHardDeleted = activeTab?.data && (activeTab.data as Note).isHardDeleted;

    return (
        <div key={noteKey} className="p-6 space-y-6 h-full ">
            {/* Full Width - Description */}
            <div className="border-none">
                <CardContent className="p-0">
                    <Textarea
                        value={selectedNote?.description || ""}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            handleNoteFieldChange("description", newValue);
                        }}
                        placeholder="Enter note description..."
                        className="min-h-[400px] resize-none font-mono text-sm"
                        disabled={isDeleted || isHardDeleted}
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
                            label="Note Name"
                            value={selectedNote?.name || ""}
                            onChange={(e) => handleNoteFieldChange("name", e.target.value)}
                            size="small"
                            disabled={isDeleted || isHardDeleted}
                        />

                        {/* HashTags */}
                        <div className="space-y-2">
                            <GenericTagAutoComplete
                                options={constants.standardRegistryFE.fallbackTagOptions as unknown as IAutoCompleteOptions[]}
                                value={currentTagsValue}
                                onChange={handleTagsChange}
                                label="HashTags"
                                placeholder={"+ Add HashTag"}
                                size="small"
                                data-testid="note-tags"
                                disabled={isDeleted || isHardDeleted}
                            />
                        </div>
                    </CardContent>
                </div>

                {/* Right Column - Metadata */}
                <div className="border-none">
                    <CardContent className="p-0 space-y-4">
                        <GenericTextField label="Created" value={formatNoteDate(selectedNote?.createdAt)} disabled size="small" />

                        <GenericTextField label="Updated" value={formatNoteDate(selectedNote?.updatedAt)} disabled size="small" />

                        <GenericTextField label="Created by" value={selectedNote?.createdBy || "-"} disabled size="small" />
                    </CardContent>
                </div>
            </div>
        </div>
    );
}
