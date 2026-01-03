/**
 * useMonacoEditor Hook
 * Manage Monaco Editor instance, decorations, and autocomplete
 */

import { useEffect, useRef, useCallback } from "react";
import * as monaco from "monaco-editor";
import "@/styles/keywords.css";

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
    console.log('[Monaco Hook] useMonacoEditor called:', { 
        initialValueLength: initialValue?.length,
        onChangeType: typeof onChange,
        disabled,
        keywordsCount: keywords?.length 
    });

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
        console.log('[Monaco Hook] Callback ref called:', {
            hasElement: !!element,
            isInitialized: isInitializedRef.current
        });

        // Assign to containerRef for external use
        (containerRef as any).current = element;

        if (!element) {
            console.warn('[Monaco Hook] Element is null, cleaning up...');
            // Cleanup when element is removed
            if (editorRef.current) {
                console.log('[Monaco Hook] Disposing editor');
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

        console.log('[Monaco Hook] Starting editor initialization with:', {
            initialValue: initialValue?.substring(0, 50),
            disabled,
            keywordsCount: keywords?.length
        });

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
            lineNumbers: "off",
            lineNumbersMinChars: 0,
            lineDecorationsWidth: 0,
            folding: false,
            glyphMargin: false,
            readOnly: disabled,
            scrollBeyondLastLine: false,
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
            },
        });

        editorRef.current = instance;
        isInitializedRef.current = true;
        console.log('[Monaco Hook] ✅ Editor created successfully');

        // Setup change listener - use ref to always get latest onChange
        instance.onDidChangeModelContent(() => {
            console.log('[Monaco Hook] 🔥 onDidChangeModelContent triggered');
            // Skip onChange if it's a programmatic change
            if (isProgrammaticChangeRef.current) {
                console.log('[Monaco Hook] Skipping - programmatic change');
                isProgrammaticChangeRef.current = false;
                return;
            }
            const value = instance.getValue();
            console.log('[Monaco Hook] 📝 Content changed, calling onChange:', value.substring(0, 50) + '...');
            onChangeRef.current(value);
            updateDecorations(instance, value, keywordsRef.current, decorationsRef);
        });

        // Setup autocomplete
        setupAutocomplete(instance, keywords);
        
        // Setup hover provider
        setupHoverProvider(instance, keywords);
        
        // Setup definition provider
        setupDefinitionProvider(instance, keywords);
        
        // Initial decorations
        updateDecorations(instance, initialValue, keywords, decorationsRef);
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
            updateDecorations(editor, value, keywords, decorationsRef);
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
            console.log('[Monaco Hook] Value sync skipped - editor not ready or disposed');
            return;
        }

        try {
            const currentValue = editor.getValue();
            console.log('[Monaco Hook] Value sync effect:', {
                currentValue: currentValue?.substring(0, 30),
                newValue: initialValue?.substring(0, 30),
                needsUpdate: currentValue !== initialValue
            });

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

/**
 * Update decorations (highlight keywords and URLs)
 */
function updateDecorations(
    editor: monaco.editor.IStandaloneCodeEditor,
    text: string,
    keywords: Array<{ text: string; type: string }>,
    decorationsRef: React.MutableRefObject<string[]>
) {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    // Highlight keywords
    keywords.forEach((kw) => {
        const regex = new RegExp(`\\b${escapeRegex(kw.text)}\\b`, "gi");
        let match;

        while ((match = regex.exec(text)) !== null) {
            const startPos = editor.getModel()!.getPositionAt(match.index);
            const endPos = editor.getModel()!.getPositionAt(match.index + kw.text.length);

            decorations.push({
                range: new monaco.Range(
                    startPos.lineNumber,
                    startPos.column,
                    endPos.lineNumber,
                    endPos.column
                ),
                options: {
                    inlineClassName: `keyword-${kw.type}`,
                    isWholeLine: false,
                },
            });
        }
    });

    // custom css URLs (http://, https://, ftp://)
    const urlRegex = /\b(https?|ftp):\/\/[^\s]+/gi;
    let urlMatch;
    
    while ((urlMatch = urlRegex.exec(text)) !== null) {
        const startPos = editor.getModel()!.getPositionAt(urlMatch.index);
        const endPos = editor.getModel()!.getPositionAt(urlMatch.index + urlMatch[0].length);

        decorations.push({
            range: new monaco.Range(
                startPos.lineNumber,
                startPos.column,
                endPos.lineNumber,
                endPos.column
            ),
            options: {
                inlineClassName: 'url-link',
                isWholeLine: false,
            },
        });
    }

    // Clear all old decorations and apply new ones
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
}

/**
 * Setup autocomplete provider
 */
function setupAutocomplete(editor: monaco.editor.IStandaloneCodeEditor, keywords: Array<{ text: string; type: string }>) {
    const disposable = monacoLanguages.registerCompletionItemProvider("markdown", {
        provideCompletionItems: (model: any, position: any) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const suggestions = keywords
                .filter((kw) => kw.text.toLowerCase().includes(word.word.toLowerCase()))
                .map((kw) => ({
                    label: kw.text,
                    kind: monacoLanguages.CompletionItemKind.Text,
                    insertText: kw.text,
                    range,
                    documentation: `Type: ${kw.type}`,
                }));

            return { suggestions };
        },
    });

    return () => disposable.dispose();
}

/**
 * Setup hover provider
 */
function setupHoverProvider(editor: monaco.editor.IStandaloneCodeEditor, keywords: Array<{ text: string; type: string }>) {
    const disposable = monacoLanguages.registerHoverProvider("markdown", {
        provideHover: (model, position) => {
            const word = model.getWordAtPosition(position);
            if (!word) return null;

            const keyword = keywords.find(kw => kw.text.toLowerCase() === word.word.toLowerCase());
            if (!keyword) return null;

            return {
                range: new monaco.Range(
                    position.lineNumber,
                    word.startColumn,
                    position.lineNumber,
                    word.endColumn
                ),
                contents: [
                    { value: `**${keyword.text}**` },
                    { value: `Type: \`${keyword.type}\`` },
                    { value: `_Click to go to definition (Ctrl+Click or F12)_` }
                ]
            };
        }
    });

    return () => disposable.dispose();
}

/**
 * Setup definition provider
 */
function setupDefinitionProvider(editor: monaco.editor.IStandaloneCodeEditor, keywords: Array<{ text: string; type: string }>) {
    const disposable = monacoLanguages.registerDefinitionProvider("markdown", {
        provideDefinition: (model, position) => {
            const word = model.getWordAtPosition(position);
            if (!word) return null;

            const keyword = keywords.find(kw => kw.text.toLowerCase() === word.word.toLowerCase());
            if (!keyword) return null;

            // Find first occurrence of this keyword in the document
            const text = model.getValue();
            const regex = new RegExp(`\\b${escapeRegex(keyword.text)}\\b`, "i");
            const match = regex.exec(text);

            if (!match) return null;

            const startPos = model.getPositionAt(match.index);
            const endPos = model.getPositionAt(match.index + keyword.text.length);

            return {
                uri: model.uri,
                range: new monaco.Range(
                    startPos.lineNumber,
                    startPos.column,
                    endPos.lineNumber,
                    endPos.column
                )
            };
        }
    });

    return () => disposable.dispose();
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
