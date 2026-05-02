import type * as _monaco from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";
import { escapeRegex, extractHeadingsAsKeywords } from "./markdown.conversion";

/**
 * Register a definition provider for Monaco (Ctrl+click / F12 to go to definition).
 * Returns a cleanup function.
 */
export function setupDefinitionProvider(
    $mi: Monaco | null,
    editor: _monaco.editor.IStandaloneCodeEditor,
    _allKeywords: Array<{ text: string; type: string }>,
    noteId?: number,
) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerDefinitionProvider("markdown", {
        provideDefinition: (model, position) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const clickColumn = position.column;

            let keyword: { text: string; type: string; path?: string } | null = null;

            for (const kw of _allKeywords) {
                const pattern = escapeRegex(kw.text);
                const regex = new RegExp(pattern, "gi");
                let match;

                while ((match = regex.exec(lineContent)) !== null) {
                    const startIndex = match.index;
                    const endIndex = startIndex + match[0].length;
                    if (clickColumn >= startIndex + 1 && clickColumn <= endIndex + 1) {
                        keyword = kw;
                        break;
                    }
                }
                if (keyword) break;
            }

            if (!keyword) return null;

            const text = model.getValue();
            const lines = text.split("\n");

            // Strategy 1: exact heading match
            for (let i = 0; i < lines.length; i++) {
                const headingMatch = lines[i].trim().match(/^(#{1,6})\s+(.+)$/);
                if (headingMatch) {
                    const cleanTitle = headingMatch[2]
                        .trim()
                        .replace(/\*\*(.+?)\*\*/g, "$1")
                        .replace(/\*(.+?)\*/g, "$1")
                        .replace(/__(.+?)__/g, "$1")
                        .replace(/_(.+?)_/g, "$1")
                        .replace(/`(.+?)`/g, "$1")
                        .replace(/~~(.+?)~~/g, "$1")
                        .trim();

                    if (cleanTitle.toLowerCase() === keyword.text.toLowerCase()) {
                        const originalLine = lines[i];
                        return {
                            uri: model.uri,
                            range: {
                                startLineNumber: i + 1,
                                startColumn: originalLine.indexOf("#") + 1,
                                endLineNumber: i + 1,
                                endColumn: originalLine.trimEnd().length + 1,
                            },
                        };
                    }
                }
            }

            // Strategy 2: explicit definition comment
            const defineCommentRegex = new RegExp(
                `<!--\\s*Define\\s*:\\s*${escapeRegex(keyword.text)}\\s*-->`,
                "i",
            );
            const defineMatch = defineCommentRegex.exec(text);
            if (defineMatch) {
                const startPos = model.getPositionAt(defineMatch.index);
                const endPos = model.getPositionAt(defineMatch.index + defineMatch[0].length);
                return {
                    uri: model.uri,
                    range: {
                        startLineNumber: startPos.lineNumber,
                        startColumn: startPos.column,
                        endLineNumber: endPos.lineNumber,
                        endColumn: endPos.column,
                    },
                };
            }

            // Strategy 3: heading containing the keyword
            const headingRegex = new RegExp(`^#{1,6}\\s+.*\\b${escapeRegex(keyword.text)}\\b.*$`, "im");
            const headingMatch = headingRegex.exec(text);
            if (headingMatch) {
                const startPos = model.getPositionAt(headingMatch.index);
                const endPos = model.getPositionAt(headingMatch.index + headingMatch[0].length);
                return {
                    uri: model.uri,
                    range: {
                        startLineNumber: startPos.lineNumber,
                        startColumn: startPos.column,
                        endLineNumber: endPos.lineNumber,
                        endColumn: endPos.column,
                    },
                };
            }

            // Strategy 4: first occurrence (fallback)
            const regex = new RegExp(`\\b${escapeRegex(keyword.text)}\\b`, "i");
            const match = regex.exec(text);
            if (!match) return null;

            const startPos = model.getPositionAt(match.index);
            const endPos = model.getPositionAt(match.index + keyword.text.length);
            return {
                uri: model.uri,
                range: {
                    startLineNumber: startPos.lineNumber,
                    startColumn: startPos.column,
                    endLineNumber: endPos.lineNumber,
                    endColumn: endPos.column,
                },
            };
        },
    });

    return () => disposable.dispose();
}

/**
 * Register a folding-range provider for markdown headings.
 * Returns a cleanup function.
 */
export function setupMarkdownFolding($mi: Monaco | null, editor: _monaco.editor.IStandaloneCodeEditor) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerFoldingRangeProvider("markdown", {
        provideFoldingRanges: (model) => {
            const lines = model.getLinesContent();
            const foldingRanges: _monaco.languages.FoldingRange[] = [];
            const headingStack: Array<{ level: number; line: number }> = [];

            for (let i = 0; i < lines.length; i++) {
                const headingMatch = lines[i].match(/^(#{1,6})\s/);
                if (headingMatch) {
                    const level = headingMatch[1].length;
                    const lineNumber = i + 1;

                    while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
                        const parent = headingStack.pop()!;
                        foldingRanges.push({
                            start: parent.line,
                            end: i,
                            kind: $mi.languages.FoldingRangeKind.Region,
                        });
                    }

                    headingStack.push({ level, line: lineNumber });
                }
            }

            while (headingStack.length > 0) {
                const parent = headingStack.pop()!;
                foldingRanges.push({
                    start: parent.line,
                    end: lines.length,
                    kind: $mi.languages.FoldingRangeKind.Region,
                });
            }

            return foldingRanges;
        },
    });

    return () => disposable.dispose();
}

/**
 * Register a hover provider for markdown keywords and headings.
 * Returns a cleanup function.
 */
export function setupHoverProvider(
    $mi: Monaco | null,
    editor: _monaco.editor.IStandaloneCodeEditor,
    _allKeywords: Array<{ text: string; type: string }>,
    noteId?: number,
) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerHoverProvider("markdown", {
        provideHover: (model, position) => {
            const currentText = model.getValue();
            const headings = extractHeadingsAsKeywords(currentText, noteId);
            const allKeywordAndHeadings = [..._allKeywords, ...headings];

            const lineContent = model.getLineContent(position.lineNumber);
            const hoverColumn = position.column;

            let keyword: { text: string; type: string } | null = null;
            let matchRange: { startColumn: number; endColumn: number; lineNumber: number } | null = null;

            for (const kw of allKeywordAndHeadings) {
                const pattern = escapeRegex(kw.text);
                const regex = new RegExp(pattern, "gi");
                let match;

                while ((match = regex.exec(lineContent)) !== null) {
                    const startIndex = match.index;
                    const endIndex = startIndex + match[0].length;

                    if (hoverColumn >= startIndex + 1 && hoverColumn <= endIndex + 1) {
                        keyword = kw;
                        matchRange = {
                            startColumn: startIndex + 1,
                            endColumn: endIndex + 1,
                            lineNumber: position.lineNumber,
                        };
                        break;
                    }
                }
                if (keyword) break;
            }

            if (!keyword || !matchRange) return null;

            return {
                range: {
                    startLineNumber: matchRange.lineNumber,
                    startColumn: matchRange.startColumn,
                    endLineNumber: matchRange.lineNumber,
                    endColumn: matchRange.endColumn,
                },
                contents: [
                    { value: `**${keyword.text}**` },
                    { value: `Type: \`${keyword.type}\`` },
                    { value: "_Click to go to definition (Ctrl+Click or F12)_" },
                ],
            };
        },
    });

    return () => disposable.dispose();
}
