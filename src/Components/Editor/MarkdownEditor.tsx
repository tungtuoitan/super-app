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
import "@/styles/keywords.css";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { MarkdownEditorTheme } from "../../HeadlessComponents/markdownEditor/MarkdownEditorTheme";
import {MarkdownEditorSync} from "@/HeadlessComponents/markdownEditor/MarkdownEditorSync"; 

export function MarkdownEditor() {
    const { registries, allKeywords } = useGeneralStore();
    const { navigateLink } = useKeywordNavigationHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const { getActiveTab } = useEditorTabHelper();
    const { handleNoteFieldChange } = useNoteDetailHelper();
    const { getItemStatus } = useTreeStatusHelper();
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
            // Format: [name] for nameIndex=1, [name][nameIndex] for others
            text: k.nameIndex === 1 ? `[${k.name}]` : `[${k.name}][${k.nameIndex}]`,
            type: k.type,
            link: k.link,
            name: k.name,
            nameIndex: k.nameIndex,
        }));
    }, [allKeywords]);

    // Handle editor mount
    const handleEditorDidMount = (editor: _monaco.editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;


        // Setup providers
        const autocompleteCleanup = setupAutocomplete($mi, editor, _allKeywords, currentNoteId);
        // const hoverCleanup = setupHoverProvider($mi, editor, _allKeywords, currentNoteId);
        const linkCleanup = setupLinkProvider($mi, editor, _allKeywords, currentNoteId);
        // const definitionCleanup = setupDefinitionProvider($mi, editor, _allKeywords, currentNoteId);
        const foldingCleanup = setupMarkdownFolding($mi, editor);

        // Store disposables for cleanup
        disposablesRef.current = [
            { dispose: autocompleteCleanup },
            // { dispose: hoverCleanup },
            { dispose: linkCleanup },
            // { dispose: definitionCleanup },
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

            // Check if line is a heading - if so, ignore click
            const trimmedLine = lineContent.trim();
            if (/^#{1,6}\s+/.test(trimmedLine)) {
                return; // Don't handle clicks on heading lines
            }

            // Check if clicking on keyword format
            if (allKeywords.length > 0) {
                for (const kw of allKeywords) {
                    // Skip if this keyword is a heading type (extracted headings)
                    if (kw.type && kw.type.startsWith('heading-')) {
                        continue; // Headings should not be clickable
                    }

                    // Two patterns to check:
                    // 1. [name][nameIndex] - explicit format
                    // 2. [name] - implicit format (for nameIndex=1)
                    const patterns = [];
                    
                    // Always check explicit format
                    patterns.push(`\\[${kw.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\[${kw.nameIndex}\\]`);
                    
                    // If nameIndex is 1, also check implicit format [name]
                    if (kw.nameIndex === 1) {
                        patterns.push(`\\[${kw.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\](?!\\[)`);
                    }

                    for (const pattern of patterns) {
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
            }
        });

        // Initial decorations with keywords only (NOT headings)
        // Headings should not have decorations/underlines
        updateDecorations(editor, displayDesc, _allKeywords, decorationsRef);
    };

    // Re-setup providers when keywords change (fix stale closures)
    // * ta phải re-setup vì closure:
    // * tức các providers đã được tạo lúc đầu sẽ "nhớ" giá trị keywords cũ,..., không cập nhật khi keywords thay đổi
    useEffect(() => {
        const editor = editorRef.current;

        // Only setup if both editor and monaco instance are ready
        if (!editor || (editor as any)._isDisposed || !$mi) {
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
            // const hoverCleanup = setupHoverProvider($mi, editor, _allKeywords, currentNoteId);
            const linkCleanup = setupLinkProvider($mi, editor, _allKeywords, currentNoteId);
            // const definitionCleanup = setupDefinitionProvider($mi, editor, _allKeywords, currentNoteId);
            const foldingCleanup = setupMarkdownFolding($mi, editor);

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
    }, [$mi, _allKeywords, currentNoteId]);

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

    if(!$mi) return null

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
