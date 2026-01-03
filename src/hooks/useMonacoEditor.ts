/**
 * useMonacoEditor Hook
 * Manage Monaco Editor instance, decorations, and autocomplete
 */

import { useEffect, useRef, useCallback } from "react";
import * as monaco from "monaco-editor";
import "@/styles/keywords.css";
import {setupAutocomplete, setupDefinitionProvider, setupHoverProvider, setupMarkdownFolding, updateDecorations, extractHeadingsAsKeywords} from "@/utils/markdown.utils";

const monacoEditor = monaco.editor;
const monacoLanguages = monaco.languages;

interface UseMonacoEditorOptions {
    initialValue: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    keywords: Array<{ text: string; type: string }>;
}

export function useMonacoEditor({
    initialValue,
    onChange,
    disabled = false,
    keywords,
}: UseMonacoEditorOptions) {

    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isInitializedRef = useRef(false);
    const onChangeRef = useRef(onChange);
    const isProgrammaticChangeRef = useRef(false);
    const keywordsRef = useRef(keywords);
    const decorationsRef = useRef<string[]>([]);

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
            const headings = extractHeadingsAsKeywords(value);
            const mergedKeywords = [...keywordsRef.current, ...headings];
            
            onChangeRef.current(value);
            updateDecorations(instance, value, mergedKeywords, decorationsRef);
        });

        // Extract headings from initial value and merge with keywords
        const initialHeadings = extractHeadingsAsKeywords(initialValue);
        const initialMergedKeywords = [...keywords, ...initialHeadings];

        // Setup providers with ONLY static keywords (they will extract headings dynamically)
        setupAutocomplete(instance, keywords);
        
        // Setup hover provider
        setupHoverProvider(instance, keywords);
        
        // Setup definition provider
        setupDefinitionProvider(instance, keywords);
        
        // Setup folding provider for markdown headings
        setupMarkdownFolding(instance);
        
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
            const headings = extractHeadingsAsKeywords(value);
            const mergedKeywords = [...keywords, ...headings];
            
            updateDecorations(editor, value, mergedKeywords, decorationsRef);
        } catch (error) {
            console.warn('[Monaco Hook] Update decorations error (editor may be disposed)');
        }
    }, [keywords]);

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




