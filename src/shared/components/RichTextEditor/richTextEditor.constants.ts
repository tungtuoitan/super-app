/**
 * RichTextEditor Constants
 * Monaco editor theme and configuration
 */

import type * as _monaco from "monaco-editor";

export const richTextEditorConstants = {
    markdown: {
        theme: {
            name: "custom-dark",
            config: {
                base: "vs-dark",
                inherit: true,
                rules: [
                    { token: "string.link.markdown", foreground: "D4D4D4" },
                    { token: "string", foreground: "D4D4D4" },
                    { token: "meta.link.inline.markdown", foreground: "D4D4D4" },
                ],
                colors: {
                    "editor.background": "#09090B",
                    "editor.foreground": "#D4D4D4",
                    "editorLineNumber.foreground": "#858585",
                    "editorCursor.foreground": "#AEAFAD",
                    "editor.selectionBackground": "#264F78",
                    "editor.inactiveSelectionBackground": "#3A3D41",
                },
            } as _monaco.editor.IStandaloneThemeData,
        },
        editor: {
            fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace",
            options: (disabled: boolean, value: string) =>
                ({
                    value,
                    language: "markdown",
                    theme: "custom-dark",
                    minimap: { enabled: false },
                    wordWrap: "on",
                    fontSize: 14,
                    fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace",
                    lineNumbers: "on",
                    lineNumbersMinChars: 3,
                    lineDecorationsWidth: 16,
                    folding: true,
                    foldingStrategy: "auto",
                    showFoldingControls: "mouseover",
                    glyphMargin: true,
                    readOnly: disabled,
                    scrollBeyondLastLine: true,
                    padding: { top: 20, bottom: 200 },
                    automaticLayout: true,
                    rulers: [],
                    renderLineHighlight: "none",
                    quickSuggestions: { other: true, comments: true, strings: true },
                    acceptSuggestionOnCommitCharacter: true,
                    acceptSuggestionOnEnter: "on",
                    wordBasedSuggestions: "off",
                    suggest: {
                        showWords: false,
                        showKeywords: true,
                        snippetsPreventQuickSuggestions: false,
                        localityBonus: true,
                        shareSuggestSelections: false,
                    },
                    parameterHints: { enabled: true },
                }) as _monaco.editor.IStandaloneEditorConstructionOptions,
        },
    } as const,
} as const;
