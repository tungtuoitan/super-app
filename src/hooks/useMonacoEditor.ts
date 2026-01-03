/**
 * useMonacoEditor Hook
 * Manage Monaco Editor instance, decorations, and autocomplete
 */

import { useEffect, useRef, useCallback } from "react";
import * as monaco from "monaco-editor";
import "@/styles/keywords.css";
import {setupAutocomplete, setupDefinitionProvider, setupHoverProvider, setupMarkdownFolding, updateDecorations, extractHeadingsAsKeywords} from "@/utils/markdown.utils";
import { useWorkspaceStore } from "@/store/index";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { noteService } from "@/services/note.service";
import { useAuthStore } from "@/store/index";
import { Note } from "@/types/note.types";
import { Keyword } from "@/types/keyword.types";
import { constants } from "@/utils/constants";
import { NoteEntity } from "@/types/workspace-v2.types";

const monacoEditor = monaco.editor;
const monacoLanguages = monaco.languages;

interface UseMonacoEditorOptions {
    initialValue: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    keywords: Array<{ text: string; type: string }>;
    currentNoteId?: number; // Current note ID for cross-note references
    allKeywords?: Keyword[]; // All keywords with links for navigation
    onKeywordClick?: (link: string) => void; // Callback when keyword is clicked
}

export function useMonacoEditor({
    initialValue,
    onChange,
    disabled = false,
    keywords,
    currentNoteId,
    allKeywords = [],
    onKeywordClick,
}: UseMonacoEditorOptions) {

    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isInitializedRef = useRef(false);
    const onChangeRef = useRef(onChange);
    const isProgrammaticChangeRef = useRef(false);
    const keywordsRef = useRef(keywords);
    const decorationsRef = useRef<string[]>([]);
    
    // Workspace integration for cross-note navigation
    const { currentWorkspace } = useWorkspaceStore();
    const { openTab } = useEditorTabHelper();
    const { $user } = useAuthStore();

    // Always keep the latest onChange callback
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Always keep the latest keywords
    useEffect(() => {
        keywordsRef.current = keywords;
    }, [keywords]);

    // Initialize editor using callback ref - memoized to prevent re-creation
    const callbackRef = useCallback((element: HTMLDivElement | null) => {
        
        // Assign to containerRef for external use
        (containerRef as any).current = element;

        if (!element) {
            console.warn('[Monaco Hook] Element is null, cleaning up...');
            // Cleanup when element is removed
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = null;
                isInitializedRef.current = false;
            }
            return;
        }

        if (isInitializedRef.current) {
            console.warn('[Monaco Hook] Already initialized, skipping...');
            return;
        }

        // Define custom dark theme with #09090B background and markdown syntax colors
        monacoEditor.defineTheme('custom-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                // Markdown-specific styling
                { token: 'emphasis', fontStyle: 'italic' },
                { token: 'strong', fontStyle: 'bold' },
                { token: 'heading', foreground: '569CD6', fontStyle: 'bold' },
                { token: 'keyword', foreground: 'C586C0' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'comment', foreground: '6A9955' },
                { token: 'type', foreground: '4EC9B0' },
                { token: 'delimiter', foreground: 'D4D4D4' },
                { token: 'number', foreground: 'B5CEA8' },
                { token: 'regexp', foreground: 'D16969' },
                // Custom keyword types
                { token: 'keyword.hashtag', foreground: '569CD6', fontStyle: 'bold' },
                { token: 'keyword.status', foreground: '4EC9B0', fontStyle: 'bold' },
                { token: 'workspace', foreground: '6A9955', fontStyle: 'bold' },
                { token: 'note', foreground: '6A9955', fontStyle: 'bold' },
                { token: 'heading-1', foreground: '6A9955', fontStyle: 'bold' },
                { token: 'heading-2', foreground: '6A9955', fontStyle: 'bold' },
                { token: 'heading-3', foreground: '6A9955', fontStyle: 'bold' },
                { token: 'heading-4', foreground: '6A9955', fontStyle: 'bold' },
                { token: 'heading-5', foreground: '6A9955', fontStyle: 'bold' },
                { token: 'heading-6', foreground: '6A9955', fontStyle: 'bold' },
            ],
            colors: {
                'editor.background': '#09090B',
                'editor.foreground': '#D4D4D4',
                'editorLineNumber.foreground': '#858585',
                'editorCursor.foreground': '#AEAFAD',
                'editor.selectionBackground': '#264F78',
                'editor.inactiveSelectionBackground': '#3A3D41',
            }
        });

        const instance = monacoEditor.create(element, {
            value: initialValue,
            language: "markdown",
            theme: "custom-dark",
            minimap: { enabled: false },
            wordWrap: "on", // Wrap at viewport width
            fontSize: 14,
            fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace",
            lineNumbers: "on", // Bật line numbers để hiển thị fold indicators
            lineNumbersMinChars: 3,
            lineDecorationsWidth: 16, // Space cho fold icons (tăng lên)
            folding: true, // Bật folding cho markdown headings
            foldingStrategy: "auto", // Auto detect folding
            showFoldingControls: "mouseover", // Hiển thị khi hover
            glyphMargin: true, // Bật glyph margin cho fold icons
            readOnly: disabled,
            scrollBeyondLastLine: true, // Cho phép scroll xuống dưới dòng cuối (~10 lines)
            padding: { top: 0, bottom: 200 }, // Khoảng trống ~10 lines ở cuối (10 * 20px)
            automaticLayout: true,
            rulers: [],
            renderLineHighlight: "none",
            // Markdown-specific options
            quickSuggestions: {
                other: true,
                comments: true,
                strings: true
            },
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: "on",
            wordBasedSuggestions: "off", // Turn off default word-based suggestions to prioritize custom keywords
            suggest: {
                showWords: false, // Don't suggest random words from the document
                showKeywords: true,
                snippetsPreventQuickSuggestions: false,
                localityBonus: true,
                shareSuggestSelections: false,
            },
            parameterHints: {
                enabled: true
            },
        });

        editorRef.current = instance;
        isInitializedRef.current = true;

        // Setup change listener - use ref to always get latest onChange
        instance.onDidChangeModelContent(() => {
            // Skip onChange if it's a programmatic change
            if (isProgrammaticChangeRef.current) {
                isProgrammaticChangeRef.current = false;
                return;
            }
            const value = instance.getValue();
            
            // Extract headings from text and merge with keywords
            const headings = extractHeadingsAsKeywords(value, currentNoteId);
            const mergedKeywords = [...keywordsRef.current];
            // const mergedKeywords = [...keywordsRef.current, ...headings];
            
            onChangeRef.current(value);
            updateDecorations(instance, value, mergedKeywords, decorationsRef);
        });

        // Extract headings from initial value and merge with keywords
        const initialHeadings = extractHeadingsAsKeywords(initialValue, currentNoteId);
        const initialMergedKeywords = [...keywords, ...initialHeadings];

        // Navigation handler for cross-note references
        const handleNavigateToNote = async (targetNoteId: number, headingPath: string) => {
            console.log('[Monaco] Navigate to note:', targetNoteId, 'path:', headingPath);
            
            try {
                // Check if note exists in current workspace
                const noteInWorkspace = currentWorkspace?.flatData?.find(
                    item => item.entityType === 3 && item.entityId === targetNoteId
                );
                
                if (noteInWorkspace) {
                    // Note exists in workspace - convert and open
                    console.log('[Monaco] Note found in workspace:', noteInWorkspace);
                    
                    // Type guard: ensure it's a note entity
                    if (noteInWorkspace.entityType !== 3) {
                        console.error('[Monaco] Item is not a note');
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
                    console.log('[Monaco] TODO: Scroll to heading:', headingPath);
                } else {
                    // Note not in workspace - fetch from API
                    console.log('[Monaco] Note not in workspace, fetching from API...');
                    
                    if (!$user?.userToken) {
                        console.error('[Monaco] No auth token available');
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
                        
                        console.log('[Monaco] Note fetched from API:', note);
                        openTab(note, constants.vscode.tab.tabTypes.note);
                        
                        // TODO: Scroll to heading after tab opens
                        console.log('[Monaco] TODO: Scroll to heading:', headingPath);
                    } else {
                        console.error('[Monaco] Failed to fetch note:', result);
                    }
                }
            } catch (error) {
                console.error('[Monaco] Error navigating to note:', error);
            }
        };

        // Setup providers with ONLY static keywords (they will extract headings dynamically)
        setupAutocomplete(instance, keywords, currentNoteId);

        // Setup hover provider
        setupHoverProvider(instance, keywords, currentNoteId);

        console.log('[Monaco Hook] Setting up definition provider with:', {
            keywordsCount: keywords.length,
            currentNoteId,
            hasHandleNavigateToNote: !!handleNavigateToNote,
            allKeywordsCount: allKeywords?.length || 0,
            hasOnKeywordClick: !!onKeywordClick,
            allKeywordsSample: allKeywords?.slice(0, 3).map(k => ({ name: k.name, type: k.type, link: k.link }))
        });

        // Setup definition provider (for preview only, no navigation)
        setupDefinitionProvider(instance, keywords, currentNoteId, handleNavigateToNote, allKeywords, undefined);

        // Setup folding provider for markdown headings
        setupMarkdownFolding(instance);

        // Setup click handler for keyword navigation (Ctrl+Click only)
        instance.onMouseDown((e) => {
            // Only handle Ctrl+Click
            if (!e.event.ctrlKey && !e.event.metaKey) return;

            const position = e.target.position;
            if (!position) return;

            const model = instance.getModel();
            if (!model) return;

            const lineContent = model.getLineContent(position.lineNumber);
            const clickColumn = position.column;

            console.log('[Monaco Click] Ctrl+Click at position:', position, 'Line:', lineContent);

            // Check if clicking on [[name|link]] format
            const wikiLinkRegex = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
            let wikiMatch;

            while ((wikiMatch = wikiLinkRegex.exec(lineContent)) !== null) {
                const startIndex = wikiMatch.index;
                const endIndex = startIndex + wikiMatch[0].length;
                const name = wikiMatch[1];
                const link = wikiMatch[2];

                if (clickColumn >= startIndex + 1 && clickColumn <= endIndex + 1) {
                    console.log('[Monaco Click] Clicked on wiki link:', { name, link });
                    if (onKeywordClick) {
                        onKeywordClick(link);
                        e.event.preventDefault();
                        e.event.stopPropagation();
                        return;
                    }
                }
            }

            // Check if clicking on [keyword] format
            if (allKeywords && onKeywordClick) {
                for (const kw of allKeywords) {
                    const pattern = `\\[${kw.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\](?!\\()`;
                    const regex = new RegExp(pattern, 'gi');

                    let match;
                    while ((match = regex.exec(lineContent)) !== null) {
                        const startIndex = match.index;
                        const endIndex = startIndex + match[0].length;

                        if (clickColumn >= startIndex + 1 && clickColumn <= endIndex + 1) {
                            console.log('[Monaco Click] Clicked on keyword:', kw.name, 'Link:', kw.link);
                            onKeywordClick(kw.link);
                            e.event.preventDefault();
                            e.event.stopPropagation();
                            return;
                        }
                    }
                }
            }
        });

        // Initial decorations with merged keywords
        updateDecorations(instance, initialValue, initialMergedKeywords, decorationsRef);
    }, []); // Empty deps - callback should never change

    // Update decorations when keywords change
    useEffect(() => {
        const editor = editorRef.current;

        // Check if editor exists and is not disposed
        if (!editor || (editor as any)._isDisposed) {
            return;
        }

        try {
            const value = editor.getValue();
            
            // Extract headings from current text and merge with keywords
            const headings = extractHeadingsAsKeywords(value, currentNoteId);
            const mergedKeywords = [...keywords, ...headings];
            
            updateDecorations(editor, value, mergedKeywords, decorationsRef);
        } catch (error) {
            console.warn('[Monaco Hook] Update decorations error (editor may be disposed)');
        }
    }, [keywords, currentNoteId]);

    // Handle disabled state
    useEffect(() => {
        const editor = editorRef.current;

        // Check if editor exists and is not disposed
        if (!editor || (editor as any)._isDisposed) {
            return;
        }

        try {
            editor.updateOptions({ readOnly: disabled });
        } catch (error) {
            console.warn('[Monaco Hook] Update options error (editor may be disposed)');
        }
    }, [disabled]);

    // Sync external value changes to editor
    useEffect(() => {
        const editor = editorRef.current;

        // Check if editor exists and is not disposed
        if (!editor || (editor as any)._isDisposed) {
            return;
        }

        try {
            const currentValue = editor.getValue();

            if (currentValue !== initialValue) {
                isProgrammaticChangeRef.current = true;
                const currentPosition = editor.getPosition();
                editor.setValue(initialValue);
                // Restore cursor position if possible
                if (currentPosition) {
                    editor.setPosition(currentPosition);
                }
            }
        } catch (error) {
            console.warn('[Monaco Hook] Value sync error (editor may be disposed):', error);
        }
    }, [initialValue]);

    // Update value from outside (e.g., when switching notes)
    const setValue = (value: string) => {
        const editor = editorRef.current;

        // Check if editor exists and is not disposed
        if (!editor || (editor as any)._isDisposed) {
            console.warn('[Monaco Hook] setValue skipped - editor not ready or disposed');
            return;
        }

        try {
            if (editor.getValue() !== value) {
                isProgrammaticChangeRef.current = true;
                editor.setValue(value);
            }
        } catch (error) {
            console.warn('[Monaco Hook] setValue error (editor may be disposed):', error);
        }
    };

    return { containerRef: callbackRef, editorRef, setValue };
}




