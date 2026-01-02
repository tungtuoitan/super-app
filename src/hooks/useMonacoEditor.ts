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

        // Define custom dark theme with #09090B background
        monacoEditor.defineTheme('custom-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#09090B',
            }
        });

        const instance = monacoEditor.create(element, {
            value: initialValue,
            language: "markdown",
            theme: "custom-dark",
            minimap: { enabled: false },
            wordWrap: "wordWrapColumn",
            wordWrapColumn: 120,
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
            updateDecorations(instance, value, keywordsRef.current);
        });

        // Setup autocomplete
        setupAutocomplete(instance, keywords);
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
            updateDecorations(editor, value, keywords);
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
 * Update decorations (highlight keywords)
 */
function updateDecorations(
    editor: monaco.editor.IStandaloneCodeEditor,
    text: string,
    keywords: Array<{ text: string; type: string }>
) {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

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

    editor.deltaDecorations([], decorations);
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

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
