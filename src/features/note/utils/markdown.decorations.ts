import type * as _monaco from "monaco-editor";
import { escapeRegex } from "./markdown.conversion";

/**
 * Update decorations — highlight keywords and URLs in the Monaco editor
 */
export function updateDecorations(
    editor: _monaco.editor.IStandaloneCodeEditor,
    text: string,
    _allKeywords: Array<{ text: string; type: string }>,
    decorationsRef: React.MutableRefObject<string[]>,
) {
    const decorations: _monaco.editor.IModelDeltaDecoration[] = [];
    const model = editor.getModel();
    if (!model) {
        console.warn("⚠️ [DECORATIONS] No model found, aborting");
        return;
    }

    _allKeywords.forEach((kw) => {
        const regex = new RegExp(escapeRegex(kw.text), "gi");
        let match;

        while ((match = regex.exec(text)) !== null) {
            const keywordText = match[0];
            const nameMatch = keywordText.match(/^\[([^\]]+)\](\d+)$/);

            if (nameMatch) {
                const name = nameMatch[1];

                const bracketStartPos = match.index;
                const nameStartPos = match.index + 1;
                const nameEndPos = match.index + 1 + name.length;
                const fullEnd = match.index + keywordText.length;

                // Opening bracket "["
                decorations.push({
                    range: {
                        startLineNumber: model.getPositionAt(bracketStartPos).lineNumber,
                        startColumn: model.getPositionAt(bracketStartPos).column,
                        endLineNumber: model.getPositionAt(nameStartPos).lineNumber,
                        endColumn: model.getPositionAt(nameStartPos).column,
                    },
                    options: {
                        inlineClassName: "keyword-bracket-open",
                        isWholeLine: false,
                        inlineClassNameAffectsLetterSpacing: true,
                    },
                });

                // Keyword name
                decorations.push({
                    range: {
                        startLineNumber: model.getPositionAt(nameStartPos).lineNumber,
                        startColumn: model.getPositionAt(nameStartPos).column,
                        endLineNumber: model.getPositionAt(nameEndPos).lineNumber,
                        endColumn: model.getPositionAt(nameEndPos).column,
                    },
                    options: {
                        inlineClassName: `keyword-name keyword-name-${kw.type}`,
                        isWholeLine: false,
                        inlineClassNameAffectsLetterSpacing: true,
                    },
                });

                // Closing bracket "]"
                const bracketClosePos = nameEndPos;
                const bracketCloseEnd = bracketClosePos + 1;
                decorations.push({
                    range: {
                        startLineNumber: model.getPositionAt(bracketClosePos).lineNumber,
                        startColumn: model.getPositionAt(bracketClosePos).column,
                        endLineNumber: model.getPositionAt(bracketCloseEnd).lineNumber,
                        endColumn: model.getPositionAt(bracketCloseEnd).column,
                    },
                    options: {
                        inlineClassName: "keyword-bracket-close",
                        isWholeLine: false,
                        inlineClassNameAffectsLetterSpacing: true,
                    },
                });

                // Index number
                const indexNumberPos = bracketCloseEnd;
                decorations.push({
                    range: {
                        startLineNumber: model.getPositionAt(indexNumberPos).lineNumber,
                        startColumn: model.getPositionAt(indexNumberPos).column,
                        endLineNumber: model.getPositionAt(fullEnd).lineNumber,
                        endColumn: model.getPositionAt(fullEnd).column,
                    },
                    options: {
                        inlineClassName: "keyword-index-number",
                        isWholeLine: false,
                        inlineClassNameAffectsLetterSpacing: true,
                    },
                });
            }
        }
    });

    // URL highlighting (http://, https://, ftp://)
    const urlRegex = /\b(https?|ftp):\/\/[^\s]+/gi;
    let urlMatch;

    while ((urlMatch = urlRegex.exec(text)) !== null) {
        const startPos = model.getPositionAt(urlMatch.index);
        const endPos = model.getPositionAt(urlMatch.index + urlMatch[0].length);

        decorations.push({
            range: {
                startLineNumber: startPos.lineNumber,
                startColumn: startPos.column,
                endLineNumber: endPos.lineNumber,
                endColumn: endPos.column,
            },
            options: {
                inlineClassName: "url-link",
                isWholeLine: false,
            },
        });
    }

    try {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
    } catch (error) {
        console.error("❌ [DECORATIONS] Failed to apply decorations:", error);
    }
}
