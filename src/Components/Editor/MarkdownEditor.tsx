/**
 * MarkdownEditor Component
 * Monaco-based editor with keyword highlighting and autocomplete
 */

import React, { useMemo, useState, useEffect, useRef } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import type * as _monaco from "monaco-editor";
import { useGeneralStore, useWorkspaceStore } from "@/store/index";
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
} from "@/utils/markdown.utils";
import { Note } from "@/types/note.types";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import {useSnackbar} from "notistack";
import { MarkdownEditorNavigationTracker } from "@/HeadlessComponents/markdownEditor/MarkdownEditorNavigationTracker";

export function MarkdownEditor() {
    const { registries, allKeywords } = useGeneralStore();
    const { navigateLink } = useKeywordNavigationHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const { getActiveTab } = useEditorTabHelper();
    const { handleNoteFieldChange } = useNoteDetailHelper();
    const { getItemStatus } = useTreeStatusHelper();
    // const $mi = useMonaco(); // Monaco instance
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc, $miRef, isMounted, setIsMounted } = useNoteDetailStore();
    const { enqueueSnackbar } = useSnackbar();

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
        if (newDisplayDesc === undefined) {
            console.warn("⚠️ [EDITOR] New content is undefined, skipping");
            return;
        }

        // CRITICAL: Update displayDesc state IMMEDIATELY để đảm bảo UI sync
        setDisplayDesc(newDisplayDesc);

        // Convert [name][nameIndewx] -> [[id]] before saving
        const originalValue = convertToOriginalVersion(newDisplayDesc, allKeywords);

        // Update backend state
        handleNoteFieldChange("description", originalValue ?? activeNote?.description ?? "");

        // CRITICAL: Update decorations IMMEDIATELY sau khi text change
        // Đảm bảo editor instance tồn tại trước khi update
        // if (editorRef.current && !((editorRef.current as any)._isDisposed)) {
        //     updateDecorations(editorRef.current, newDisplayDesc, _allKeywords, decorationsRef);
        // }
    };

    // Extract keywords from registries + allKeywords
    const _allKeywords = useMemo(() => {
        return allKeywords.map((k) => ({
            // New format: [name]nameIndex (always show nameIndex, even if it's 1)
            text: `[${k.name}]${k.nameIndex}`,
            type: k.type,
            link: k.link,
            longLink: k.longLink,
            name: k.name,
            nameIndex: k.nameIndex,
            hardDeletedAt: k.hardDeletedAt, // Pass through for autocomplete filtering
        }));
    }, [allKeywords]);

    // Handle editor mount
    const handleEditorDidMount = (editor: _monaco.editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;
        setIsMounted(true);

        // Setup providers
        const autocompleteCleanup = setupAutocomplete($miRef.current, editor, _allKeywords, currentNoteId);
        // const hoverCleanup = setupHoverProvider($miRef.current, editor, _allKeywords, currentNoteId);
        const linkCleanup = setupLinkProvider($miRef.current, editor, allKeywords, navigateLink, enqueueSnackbar, currentNoteId);
        // const definitionCleanup = setupDefinitionProvider($mi, editor, _allKeywords, currentNoteId);
        const foldingCleanup = setupMarkdownFolding($miRef.current, editor);
        // Store disposables for cleanup
        disposablesRef.current = [
            { dispose: autocompleteCleanup },
            // { dispose: hoverCleanup },
            { dispose: linkCleanup },
            // { dispose: definitionCleanup },
            { dispose: foldingCleanup },
        ];

        // Setup Ctrl key tracking for hover effect
        // Khi Ctrl được giữ → thêm class 'ctrl-pressed' vào editor để CSS apply hover effect
        const editorDomNode = editor.getDomNode();
        if (editorDomNode) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.ctrlKey || e.metaKey) {
                    editorDomNode.classList.add("ctrl-pressed");
                }
            };

            const handleKeyUp = (e: KeyboardEvent) => {
                if (!e.ctrlKey && !e.metaKey) {
                    editorDomNode.classList.remove("ctrl-pressed");
                }
            };

            // Xử lý trường hợp blur (editor mất focus khi đang giữ Ctrl)
            const handleBlur = () => {
                editorDomNode.classList.remove("ctrl-pressed");
            };

            window.addEventListener("keydown", handleKeyDown);
            window.addEventListener("keyup", handleKeyUp);
            window.addEventListener("blur", handleBlur);

            // Cleanup function sẽ được gọi khi component unmount
            disposablesRef.current.push({
                dispose: () => {
                    window.removeEventListener("keydown", handleKeyDown);
                    window.removeEventListener("keyup", handleKeyUp);
                    window.removeEventListener("blur", handleBlur);
                    editorDomNode.classList.remove("ctrl-pressed");
                },
            });
        }

        // Initial decorations with keywords only (NOT headings)
        // Headings should not have decorations/underlines
        updateDecorations(editor, displayDesc ?? "", _allKeywords, decorationsRef);
    };

    // Re-setup providers when keywords change (fix stale closures)
    // * ta phải re-setup vì closure:
    // * tức các providers đã được tạo lúc đầu sẽ "nhớ" giá trị keywords cũ,..., không cập nhật khi keywords thay đổi
    useEffect(() => {
        const editor = editorRef.current;

        // Only setup if both editor and monaco instance are ready
        if (!editor || (editor as any)._isDisposed || !$miRef.current) {
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
            const autocompleteCleanup = setupAutocomplete($miRef.current, editor, _allKeywords, currentNoteId);
            // const hoverCleanup = setupHoverProvider($miRef.current, editor, _allKeywords, currentNoteId);
            const linkCleanup = setupLinkProvider($miRef.current, editor, allKeywords, navigateLink, enqueueSnackbar, currentNoteId);
            // const definitionCleanup = setupDefinitionProvider($miRef.current, editor, _allKeywords, currentNoteId);
            const foldingCleanup = setupMarkdownFolding($miRef.current, editor);

            disposablesRef.current = [
                { dispose: autocompleteCleanup },
                // { dispose: hoverCleanup },
                { dispose: linkCleanup },
                // { dispose: definitionCleanup },
                { dispose: foldingCleanup },
            ];
        } catch (error) {
            console.warn("[Monaco] Provider setup error (editor may be disposed)");
        }
    }, [_allKeywords, currentNoteId]); // Re-run when keywords or note changes

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

    if (!$miRef.current || allKeywords.length === 0) return null;

    return (
        <>
            {/* //* phải mounted thì mới có editor để gắn listener */}
            {isMounted && <MarkdownEditorNavigationTracker />}
            {

            }
            <Editor
                height={540}
                defaultLanguage="markdown"
                theme={constants.markdown.theme.name}
                value={displayDesc ?? ""}
                onChange={handleDisplayChange}
                onMount={handleEditorDidMount}
                options={constants.markdown.editor.options(disabled, displayDesc ?? "")}
            />
        </>
    );
}
