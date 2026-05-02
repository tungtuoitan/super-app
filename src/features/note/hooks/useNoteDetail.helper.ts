
import { noteService } from "../service/note.service";
import { shellConstants } from "@/shell";
import { transformANote } from "../utils/note.utils";
import { Note, UpsertNoteDTO } from "../types/note.types";
import { useNoteGridHelper } from "./useNoteGrid.helper";
import { constants, useGetStandardRegistry } from "@/shared";
import { useWorkspaceLoader } from "@/features/workspace";
import { useAuthStore } from "@/shared";
import { parseApiError, isUnauthorizedError } from "@/shared";
import { IAutoCompleteOptions } from "@/shared";
import { useEditorTabBarHelper } from "@/shell";
import { useSideBarHelper } from "@/shell";
import { useConsoleHelper } from "@/shared";
import {useKeywordHelper} from "@/shared";

export const useNoteDetailHelper = () => {
    const { $user } = useAuthStore();
    const { loadNotes } = useNoteGridHelper();
    const { loadTree } = useWorkspaceLoader();
    const _console = useConsoleHelper();
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
    const { moduleName } = useSideBarHelper();
    const { loadKeywords } = useKeywordHelper();

    const handleNoteFieldChange = (field: keyof Note, value: any) => {
        const activeTab = getActiveTab();
        if (!activeTab || activeTab.type !== shellConstants.vscode.tab.tabTypes.note) {
            return;
        }

        const activeNote = activeTab.data as Note;

        let _value;
        if (field === "statusCode") {
            _value = value?.target?.value?.id || null;
        } else {
            _value = value;
        }

        if (field === "name" && typeof _value === "string") {
            _value = _value.charAt(0).toUpperCase() + _value.slice(1);
        }

        if (field === 'icon') {
            const _value = value.iconType;
            const defaultColor = value.defaultColor;
        }
        let updated = { ...activeNote, [field]: _value };

        if (field === 'icon') {
            updated = { ...activeNote, icon: value.iconType, color: value.defaultColor };
        }

        patchTab(activeTab.id, { data: updated });
    };

    /**
     * Save current note (create or update using Upsert pattern)
     */
    const upsertNote = 
        async (tabId?: string): Promise<Note | null> => {
            const activeTab = getActiveTab();
            if (!activeTab || activeTab.type !== shellConstants.vscode.tab.tabTypes.note) {
                _console.warning("⚠️ No note tab active to upsert");
                return null;
            }

            const activeNote = activeTab.data as Note;

            if (!activeNote.name || activeNote.name.trim() === "") {
                _console.error("Note name is required");
                return null;
            }

            const isCreateMode = activeNote.id <= 0;
            const originalNote = activeTab.data0 as Note | undefined;
            const isRestoreMode = activeNote.id > 0 && originalNote?.deletedAt && !activeNote.deletedAt;
            const token = $user.userToken;

            try {
                const upsertData: UpsertNoteDTO = {
                    id: isCreateMode ? 0 : activeNote.id,
                    name: activeNote.name,
                    description: activeNote.description,
                    type: activeNote.type,
                    statusCode: activeNote.statusCode,
                    icon: activeNote.icon,
                    color: activeNote.color,
                    deletedAt: isRestoreMode ? null : undefined,
                };

                const result = await noteService._upsertNotes(token, [upsertData]);
                if (!result.success) {
                    throw new Error(result.message || "Failed to save note");
                }

                const savedNote = result?.data?.[0];

                if (!savedNote) {
                    throw new Error("Failed to save note: No data returned from server");
                }
                const transformedNote = transformANote(savedNote);

                _console.success(isCreateMode ? "Note created successfully" : "Note saved successfully");

                if (tabId) {
                    patchTab(tabId, {
                        data: transformedNote,
                        data0: transformedNote,
                        title: transformedNote.name || "Unsaved Note",
                    });
                }

                if (moduleName === "Note") {
                    loadNotes();
                } else if (moduleName === "Workspace") {
                    loadTree();
                }

                loadKeywords();

                return transformedNote;
            } catch (error) {
                console.error("❌ Failed to save note:", error);
                const errorMessage = await parseApiError(error);

                if (isUnauthorizedError(error)) {
                    _console.error("Unauthorized. Please login again.");
                } else {
                    _console.error(`Failed to save note: ${errorMessage}`);
                }
                return null;
            }
        }

    const hastags = useGetStandardRegistry("hashtag");
    const hashtagOptions = hastags
        .filter((r:any) => r.isActive)
        .map((item:any) => ({
            id: item.code,
            label: item.code,
            desc: item.description || item.code,
            active: item.isActive,
        }));

    const handleHashTagsChange = (hashtagsString: string) => {
        const hashtagIds = hashtagsString
            ? hashtagsString
                  .split(",")
                  .map((id) => id.trim())
                  .filter((id) => id)
            : [];

        const hashtagObjects = hashtagIds
            .map((hashtagId) => {
                const foundOption = hashtagOptions.find((option: IAutoCompleteOptions) => option.id === hashtagId);
                if (foundOption) {
                    return {
                        id: parseInt(foundOption.id as string),
                        name: foundOption.label,
                        description: foundOption.desc,
                        isActive: foundOption.active,
                        createdAt: new Date(),
                    };
                }
                return null;
            })
            .filter((hashtag) => hashtag !== null);

        handleNoteFieldChange("hashtags", hashtagObjects);
    };

    return {
        upsertNote,
        handleNoteFieldChange,
        handleHashTagsChange,
    };
};




