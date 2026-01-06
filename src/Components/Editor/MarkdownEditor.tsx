/**
 * MarkdownEditor Component
 * Monaco-based editor with keyword highlighting and autocomplete
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import type * as _monaco from "monaco-editor";
import { useGeneralStore, useWorkspaceStore, useEditorTabsStore, useAuthStore } from "@/store/index";
import { useKeywordNavigationHelper } from "@/hooks/keyword/useKeywordNavigation.helper";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useNoteDetailHelper } from "@/hooks/note/useNoteDetail.helper";
import { useTreeStatusHelper } from "@/hooks/workspace/useTreeStatusHelper";
import { constants } from "@/utils/constants";
import {
    convertToDisplayVersion,
    convertToOriginalVersion,
    setupAutocomplete,
    setupDefinitionProvider,
    setupHoverProvider,
    setupLinkProvider,
    setupMarkdownFolding,
    updateDecorations,
    extractHeadingsAsKeywords,
} from "@/utils/markdown.utils";
import { Note } from "@/types/note.types";
import { NoteEntity } from "@/types/workspace-v2.types";
import { noteService } from "@/services/note.service";
import "@/styles/keywords.css";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { MarkdownEditorTheme } from "../../HeadlessComponents/markdownEditor/MarkdownEditorTheme";
import {MarkdownEditorSync} from "@/HeadlessComponents/markdownEditor/MarkdownEditorSync"; 

export function MarkdownEditor() {
    const { registries, allKeywords } = useGeneralStore();
    const { navigateLink } = useKeywordNavigationHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const { getActiveTab, openTab } = useEditorTabHelper();
    const { handleNoteFieldChange } = useNoteDetailHelper();
    const { getItemStatus } = useTreeStatusHelper();
    const { $user } = useAuthStore();
    const $mi = useMonaco(); // Monaco instance
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc } = useNoteDetailStore();

    // Get active tab and note
    const activeTab = getActiveTab();
    const activeNote = activeTab?.type === constants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;
    const currentNoteId = activeNote?.id;

    // Check if note is disabled (deleted or has deleted ancestor)
    const _itemStatus = getItemStatus(currentWorkspace?.flatData?.find((i) => i.entityId === activeNote?.id && i.entityType === 3));
    const isDeleted = activeNote?.deletedAt !== null;
    const isHardDeleted = activeNote?.isHardDeleted;
    const disabled = isDeleted || isHardDeleted || _itemStatus.hasDeletedAncestor;

    // Handle internal changes: Convert to original version before saving
    const handleDisplayChange = (newDisplayDesc: string | undefined) => {
        if (newDisplayDesc === undefined) return;

        setDisplayDesc(newDisplayDesc);

        // Convert [name][nameIndex] -> [[id]] before saving
        const originalValue = convertToOriginalVersion(newDisplayDesc, allKeywords);
        handleNoteFieldChange("description", originalValue);
    };

    // Extract keywords from registries + allKeywords
    const _allKeywords = useMemo(() => {
        return allKeywords.map((k) => ({
            text: `[${k.name}][${k.nameIndex}]`,
            type: k.type,
            link: k.link,
            name: k.name,
            nameIndex: k.nameIndex,
        }));
    }, [allKeywords]);

    // Navigation handler for cross-note references
    const handleNavigateToNote = useCallback(
        async (targetNoteId: number, headingPath: string) => {
            try {
                // Check if note exists in current workspace
                const noteInWorkspace = currentWorkspace?.flatData?.find((item) => item.entityType === 3 && item.entityId === targetNoteId);

                if (noteInWorkspace) {
                    // Note exists in workspace - convert and open

                    // Type guard: ensure it's a note entity
                    if (noteInWorkspace.entityType !== 3) {
                        console.error("[Monaco] Item is not a note");
                        return;
                    }

                    const noteData = noteInWorkspace.data as NoteEntity;

                    const note: Note = {
                        id: noteData.id,
                        name: noteData.name,
                        description: noteData.description || "",
                        hashtags: "",
                        type: "idea",
                        statusCode: noteData.statusCode,
                        createdAt: new Date(noteData.createdAt),
                        updatedAt: noteData.updatedAt ? new Date(noteData.updatedAt) : undefined,
                        createdBy: "You",
                        deletedAt: noteData.deletedAt ? new Date(noteData.deletedAt) : null,
                        userId: noteData.userId,
                    };

                    openTab(note, constants.vscode.tab.tabTypes.note);

                    // TODO: Scroll to heading after tab opens
                } else {
                    // Note not in workspace - fetch from API

                    if (!$user?.userToken) {
                        console.error("[Monaco] No auth token available");
                        return;
                    }

                    const result = await noteService._getNoteById($user.userToken, targetNoteId);

                    if (result.success && result.data) {
                        const noteDTO = Array.isArray(result.data) ? result.data[0] : result.data;

                        const note: Note = {
                            id: noteDTO.id,
                            name: noteDTO.name,
                            description: noteDTO.description || "",
                            hashtags: "",
                            type: "idea",
                            statusCode: noteDTO.statusCode,
                            createdAt: new Date(noteDTO.createdAt),
                            updatedAt: noteDTO.updatedAt ? new Date(noteDTO.updatedAt) : undefined,
                            createdBy: "You",
                            deletedAt: noteDTO.deletedAt ? new Date(noteDTO.deletedAt) : null,
                            userId: noteDTO.userId,
                        };

                        openTab(note, constants.vscode.tab.tabTypes.note);

                        // TODO: Scroll to heading after tab opens
                    } else {
                        console.error("[Monaco] Failed to fetch note:", result);
                    }
                }
            } catch (error) {
                console.error("[Monaco] Error navigating to note:", error);
            }
        },
        [currentWorkspace, $user, openTab]
    );

    // Handle editor mount
    const handleEditorDidMount = (editor: _monaco.editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;

        // Extract headings from initial value and merge with keywords
        const initialHeadings = extractHeadingsAsKeywords(displayDesc, currentNoteId);
        const initialMergedKeywords = [..._allKeywords, ...initialHeadings];

        // Setup providers
        const autocompleteCleanup = setupAutocomplete($mi, editor, _allKeywords, currentNoteId);
        const hoverCleanup = setupHoverProvider($mi, editor, _allKeywords, currentNoteId);
        const linkCleanup = setupLinkProvider($mi, editor, _allKeywords, currentNoteId);
        const definitionCleanup = setupDefinitionProvider($mi, editor, _allKeywords, currentNoteId, handleNavigateToNote);
        const foldingCleanup = setupMarkdownFolding($mi, editor);

        // Store disposables for cleanup
        disposablesRef.current = [
            { dispose: autocompleteCleanup },
            { dispose: hoverCleanup },
            { dispose: linkCleanup },
            { dispose: definitionCleanup },
            { dispose: foldingCleanup },
        ];

        // Setup click handler for keyword navigation (Ctrl+Click only)
        editor.onMouseDown((e) => {
            // Only handle Ctrl+Click
            if (!e.event.ctrlKey && !e.event.metaKey) return;

            const position = e.target.position;
            if (!position) return;

            const model = editor.getModel();
            if (!model) return;

            const lineContent = model.getLineContent(position.lineNumber);
            const clickColumn = position.column;

            // Check if clicking on [name][nameIndex] format
            if (allKeywords.length > 0) {
                for (const kw of allKeywords) {
                    // Pattern: [name][nameIndex]
                    const pattern = `\\[${kw.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\[${kw.nameIndex}\\]`;
                    const regex = new RegExp(pattern, "gi");

                    let match;
                    while ((match = regex.exec(lineContent)) !== null) {
                        const startIndex = match.index;
                        const endIndex = startIndex + match[0].length;

                        if (clickColumn >= startIndex + 1 && clickColumn <= endIndex + 1) {
                            navigateLink(kw.link);
                            e.event.preventDefault();
                            e.event.stopPropagation();
                            return;
                        }
                    }
                }
            }
        });

        // Initial decorations with merged keywords
        updateDecorations(editor, displayDesc, initialMergedKeywords, decorationsRef);
    };

    // Re-setup providers when keywords change (fix stale closures)
    // * ta phải re-setup vì closure:
    // * tức các providers đã được tạo lúc đầu sẽ "nhớ" giá trị keywords cũ,..., không cập nhật khi keywords thay đổi
    useEffect(() => {
        const editor = editorRef.current;

        if (!editor || (editor as any)._isDisposed) {
            return;
        }

        try {
            // Dispose old providers
            disposablesRef.current.forEach((d) => {
                try {
                    d.dispose();
                } catch (error) {
                    // Ignore disposal errors
                }
            });
            disposablesRef.current = [];

            // Re-setup providers with fresh keywords
            const autocompleteCleanup = setupAutocomplete($mi, editor, _allKeywords, currentNoteId);
            const hoverCleanup = setupHoverProvider($mi, editor, _allKeywords, currentNoteId);
            const linkCleanup = setupLinkProvider($mi, editor, _allKeywords, currentNoteId);
            const definitionCleanup = setupDefinitionProvider($mi, editor, _allKeywords, currentNoteId, handleNavigateToNote);
            const foldingCleanup = setupMarkdownFolding($mi, editor);

            disposablesRef.current = [
                { dispose: autocompleteCleanup },
                { dispose: hoverCleanup },
                { dispose: linkCleanup },
                { dispose: definitionCleanup },
                { dispose: foldingCleanup },
            ];
        } catch (error) {
            console.warn("[Monaco] Provider setup error (editor may be disposed)");
        }
    }, [$mi, _allKeywords, currentNoteId, handleNavigateToNote]);

    // Handle disabled state
    useEffect(() => {
        const editor = editorRef.current;

        if (!editor || (editor as any)._isDisposed) {
            return;
        }

        try {
            editor.updateOptions({ readOnly: disabled });
        } catch (error) {
            console.warn("[Monaco] Update options error (editor may be disposed)");
        }
    }, [disabled]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Dispose all providers
            disposablesRef.current.forEach((d) => {
                try {
                    d.dispose();
                } catch (error) {
                    // Silently ignore disposal errors
                }
            });
            disposablesRef.current = [];

            // Editor will be disposed by @monaco-editor/react automatically
        };
    }, []);

    return (
        <>
            <MarkdownEditorSync />
            <MarkdownEditorTheme $mi={$mi} />
            <Editor
                height={540}
                defaultLanguage="markdown"
                theme={constants.markdown.theme.name}
                value={displayDesc}
                onChange={handleDisplayChange}
                onMount={handleEditorDidMount}
                options={constants.markdown.editor.options(disabled, displayDesc)}
            />
        </>
    );
}
