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

export function MarkdownEditor() {
    const { registries, allKeywords } = useGeneralStore();
    const { navigateLink } = useKeywordNavigationHelper();
    const { currentWorkspace } = useWorkspaceStore();
    const { getActiveTab } = useEditorTabHelper();
    const { handleNoteFieldChange } = useNoteDetailHelper();
    const { getItemStatus } = useTreeStatusHelper();
    // const $mi = useMonaco(); // Monaco instance
    const { editorRef, decorationsRef, disposablesRef, displayDesc, setDisplayDesc, $miRef } = useNoteDetailStore();

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
        console.log('📝 [EDITOR] New content:', newDisplayDesc);

        if (newDisplayDesc === undefined) {
            console.warn('⚠️ [EDITOR] New content is undefined, skipping');
            return;
        }
                setDisplayDesc(newDisplayDesc); // phải update ở đây, nếu không sẽ bị chớp

        // Convert [name][nameIndex] -> [[id]] before savingt
        const originalValue = convertToOriginalVersion(newDisplayDesc, allKeywords);
        handleNoteFieldChange("description", originalValue);
        updateDecorations(editorRef.current!, newDisplayDesc, _allKeywords, decorationsRef);
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

        // Setup providers
        const autocompleteCleanup = setupAutocomplete($miRef.current, editor, _allKeywords, currentNoteId);
        // const hoverCleanup = setupHoverProvider($mi, editor, _allKeywords, currentNoteId);
        const linkCleanup = setupLinkProvider($miRef.current, editor, _allKeywords, currentNoteId);
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

            // Check if clicking on keyword format
            // If keyword is in allKeywords (including headings), it's clickable
            // If heading text is NOT in allKeywords, it won't match and won't be clickable
            if (allKeywords.length > 0) {
                for (const kw of allKeywords) {
                    // New format: [name]nameIndex (e.g., [w1]2)
                    const patterns = [];

                    // Pattern: [name]number
                    patterns.push(`\\[${kw.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]${kw.nameIndex}`);

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
            const linkCleanup = setupLinkProvider($miRef.current, editor, _allKeywords, currentNoteId);
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

    if(!$miRef.current || allKeywords.length===0) return null

    return (
        <>
            <Editor
                height={540}
                defaultLanguage="markdown"
                theme={constants.markdown.theme.name}
                value={displayDesc??""}
                onChange={handleDisplayChange}
                onMount={handleEditorDidMount}
                options={constants.markdown.editor.options(disabled, displayDesc??"")}
            />
        </>
    );
}
