/**
 * MarkdownEditor Component
 * Monaco-based editor with keyword highlighting and autocomplete
 */

import React, { useMemo, useState, useEffect, useRef } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import type * as _monaco from "monaco-editor";
import { useWorkspaceStore } from "@/features/workspace";
import { useKeywordNavigationHelper } from "@/shell";
import { useEditorTabBarHelper } from "@/shell";
import { useNoteDetailHelper } from "@/features/note/hooks/useNoteDetail.helper";
import { useTreeStatusHelper } from "@/features/workspace";
import { useKeywordSelector } from "@/shared";
import { shellConstants } from "@/shell";
import { richTextEditorConstants } from "@/shared";
import { Loader2 } from "lucide-react";
import {
    convertToDisplayVersion,
    convertToOriginalVersion,
    setupAutocomplete,
    setupDefinitionProvider,
    setupHoverProvider,
    setupLinkProvider,
    setupMarkdownFolding,
    updateDecorations,
} from "@/features/note/utils/markdown.utils";
import { Note } from "@/features/note/types/note.types";
import { useNoteDetailStore } from "@/features/note/store/useNoteDetail.store";
import {useMarkdownEditorViewStateSync} from "../hooks/useMarkdownEditorViewStateSync";
import {useEditorTabBarStore} from "@/shell";

export function MarkdownEditor() {
    const { allKeywords } = useKeywordSelector();
    const { navigateLink } = useKeywordNavigationHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const { getActiveTab } = useEditorTabBarHelper();
    const { handleNoteFieldChange } = useNoteDetailHelper();
    const { getItemStatus } = useTreeStatusHelper();
    const { isLoadingTab } = useEditorTabBarStore();

    // const $mi = useMonaco(); // Monaco instance
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc, $miRef, isMounted, setIsMounted, editorMountCount, setEditorMountCount } = useNoteDetailStore();
    useMarkdownEditorViewStateSync();

    // Get active tab and note
    const activeTab = getActiveTab();
    const activeNote = activeTab?.type === shellConstants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;
    const currentNoteId = activeNote?.id;

    // Check if note is disabled (deleted or has deleted ancestor)
    const _itemStatus = getItemStatus(currentWorkspace?.flatData?.find((i) => i.entityId === activeNote?.id && i.entityType === 3));
    const isDeleted = activeNote?.deletedAt !== null;
    const isHardDeleted = activeNote?.isHardDeleted;
    const disabled = isDeleted || isHardDeleted || _itemStatus.hasDeletedAncestor;

    // Handle internal changes: Convert to original version before saving
    const handleDisplayChange = (newDisplayDesc: string | undefined) => {
        if (newDisplayDesc === undefined) {
            console.warn("âš ï¸ [EDITOR] New content is undefined, skipping");
            return;
        }

        // CRITICAL: Update displayDesc state IMMEDIATELY Ä‘á»ƒ Ä‘áº£m báº£o UI sync
        setDisplayDesc(newDisplayDesc);

        // Convert [name][nameIndewx] -> [[id]] before saving
        const originalValue = convertToOriginalVersion(newDisplayDesc, allKeywords);

        // Update backend state
        handleNoteFieldChange("description", originalValue ?? activeNote?.description ?? "");

        // CRITICAL: Update decorations IMMEDIATELY sau khi text change
        // Äáº£m báº£o editor instance tá»“n táº¡i trÆ°á»›c khi update
        // if (editorRef.current && !((editorRef.current as any)._isDisposed)) {
        //     updateDecorations(editorRef.current, newDisplayDesc, _allKeywords, decorationsRef);
        // }
    };

    // Extract keywords from registries + allKeywords
    const _allKeywords = useMemo(() => {
        return allKeywords.map((k) => ({
            // REMOVED: nameIndex no longer in keyword
            // text: `[${k.name}]${k.nameIndex}`,
            text: `[${k.name}]`,
            type: k.type,
            link: k.link,
            longLink: k.longLink,
            name: k.name,
            // nameIndex: k.nameIndex, // REMOVED
            hardDeletedAt: k.hardDeletedAt,
        }));
    }, [allKeywords]);

    // Handle editor mount
    const handleEditorDidMount = (editor: _monaco.editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;
        setIsMounted(true);
        setEditorMountCount((c) => c + 1);

        // Setup providers
        // const autocompleteCleanup = setupAutocomplete($miRef.current, editor, _allKeywords, currentNoteId);
        // // const hoverCleanup = setupHoverProvider($miRef.current, editor, _allKeywords, currentNoteId);
        // const linkCleanup = setupLinkProvider($miRef.current, editor, allKeywords, navigateLink, _console, currentNoteId);
        // const definitionCleanup = setupDefinitionProvider($mi, editor, _allKeywords, currentNoteId);
        const foldingCleanup = setupMarkdownFolding($miRef.current, editor);
        // Store disposables for cleanup
        disposablesRef.current = [
            // { dispose: autocompleteCleanup },
            // // { dispose: hoverCleanup },
            // { dispose: linkCleanup },
            // { dispose: definitionCleanup },
            { dispose: foldingCleanup },
        ];

        // Setup Ctrl key tracking for hover effect
        // Khi Ctrl Ä‘Æ°á»£c giá»¯ â†’ thÃªm class 'ctrl-pressed' vÃ o editor Ä‘á»ƒ CSS apply hover effect
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

            // Xá»­ lÃ½ trÆ°á»ng há»£p blur (editor máº¥t focus khi Ä‘ang giá»¯ Ctrl)
            const handleBlur = () => {
                editorDomNode.classList.remove("ctrl-pressed");
            };

            window.addEventListener("keydown", handleKeyDown);
            window.addEventListener("keyup", handleKeyUp);
            window.addEventListener("blur", handleBlur);

            // Cleanup function sáº½ Ä‘Æ°á»£c gá»i khi component unmount
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
        // updateDecorations(editor, displayDesc ?? "", _allKeywords, decorationsRef);
    };

    // Re-setup providers when keywords change (fix stale closures)
    // * ta pháº£i re-setup vÃ¬ closure:
    // * tá»©c cÃ¡c providers Ä‘Ã£ Ä‘Æ°á»£c táº¡o lÃºc Ä‘áº§u sáº½ "nhá»›" giÃ¡ trá»‹ keywords cÅ©,..., khÃ´ng cáº­p nháº­t khi keywords thay Ä‘á»•i
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
            // const autocompleteCleanup = setupAutocomplete($miRef.current, editor, _allKeywords, currentNoteId);
            // const hoverCleanup = setupHoverProvider($miRef.current, editor, _allKeywords, currentNoteId);
            // const linkCleanup = setupLinkProvider($miRef.current, editor, allKeywords, navigateLink, _console, currentNoteId);
            // const definitionCleanup = setupDefinitionProvider($miRef.current, editor, _allKeywords, currentNoteId);
            const foldingCleanup = setupMarkdownFolding($miRef.current, editor);

            disposablesRef.current = [
                // { dispose: autocompleteCleanup },
                // { dispose: hoverCleanup },
                // { dispose: linkCleanup },
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
        <div className="relative w-full h-[calc(100%-118px)]">
            {/* //* pháº£i mounted thÃ¬ má»›i cÃ³ editor Ä‘á»ƒ gáº¯n listener */}


            <Editor
                height={"100%"}
                defaultLanguage="markdown"
                theme={richTextEditorConstants.markdown.theme.name}
                value={displayDesc ?? ""}
                onChange={handleDisplayChange}
                onMount={handleEditorDidMount}
                options={richTextEditorConstants.markdown.editor.options(disabled, displayDesc ?? "")}
            />

            {/* Loading Overlay */}
            {isLoadingTab && (
                <div className="absolute h-full inset-0 bg-background backdrop-blur-sm flex items-center justify-center z-50">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}
        </div>
    );
}

