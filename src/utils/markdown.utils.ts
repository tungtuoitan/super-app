import { useEffect, useRef, useCallback } from "react";
import type * as _monaco from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";
import "@/styles/keywords.css";

/**
 * Update decorations (highlight _allKeywords and URLs)
 */
export function updateDecorations(
    editor: _monaco.editor.IStandaloneCodeEditor,
    text: string,
    _allKeywords: Array<{ text: string; type: string }>,
    decorationsRef: React.MutableRefObject<string[]>
) {
    const decorations: _monaco.editor.IModelDeltaDecoration[] = [];
    const model = editor.getModel();
    if (!model) return;

    // Get all heading lines to skip decorating them
    const headingLines = new Set<number>();
    const lines = text.split("\n");
    lines.forEach((line, index) => {
        if (/^#{1,6}\s+/.test(line.trim())) {
            headingLines.add(index + 1); // Monaco uses 1-based line numbers
        }
    });

    // Highlight _allKeywords in [name][nameIndex] format
    _allKeywords.forEach((kw) => {
        // Match keyword pattern: [name][nameIndex]
        const regex = new RegExp(escapeRegex(kw.text), "gi");
        let match;

        while ((match = regex.exec(text)) !== null) {
            const startPos = model.getPositionAt(match.index);
            const endPos = model.getPositionAt(match.index + match[0].length);

            // Skip if this keyword is on a heading line (the title itself)
            if (headingLines.has(startPos.lineNumber)) {
                continue;
            }

            decorations.push({
                range: {
                    startLineNumber: startPos.lineNumber,
                    startColumn: startPos.column,
                    endLineNumber: endPos.lineNumber,
                    endColumn: endPos.column,
                },
                options: {
                    inlineClassName: `keyword-${kw.type}`,
                    isWholeLine: false,
                    // Add underline for better visibility
                    inlineClassNameAffectsLetterSpacing: true,
                },
            });
        }
    });

    // custom css URLs (http://, https://, ftp://)
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

    // Wiki-style links [[name|link]]
    const wikiLinkRegex = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
    let wikiMatch;

    while ((wikiMatch = wikiLinkRegex.exec(text)) !== null) {
        const startPos = model.getPositionAt(wikiMatch.index);
        const endPos = model.getPositionAt(wikiMatch.index + wikiMatch[0].length);

        decorations.push({
            range: {
                startLineNumber: startPos.lineNumber,
                startColumn: startPos.column,
                endLineNumber: endPos.lineNumber,
                endColumn: endPos.column,
            },
            options: {
                inlineClassName: "wiki-link",
                isWholeLine: false,
            },
        });
    }

    // Clear all old decorations and apply new ones
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
}

/**
 * Setup autocomplete provider with dynamic heading extraction
 */
export function setupAutocomplete(
    $mi: Monaco | null,
    editor: _monaco.editor.IStandaloneCodeEditor,
    _allKeywords: Array<{ text: string; type: string; link?: string }>,
    noteId?: number
) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerCompletionItemProvider("markdown", {
        // Trigger characters để autocomplete dễ xuất hiện hơn
        triggerCharacters: ["#", "@", "[", " ", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"],

        provideCompletionItems: (model: any, position: any) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);

            // Check if current line is a heading - if so, don't autocomplete headings
            const isOnHeadingLine = /^#{1,6}\s+/.test(lineContent);

            // Dynamically extract headings from current text (excluding current line if it's a heading)
            const currentText = model.getValue();
            const headings = isOnHeadingLine
                ? [] // Don't extract headings when typing on a heading line
                : extractHeadingsAsKeywords(currentText, noteId);

            // Merge with static _allKeywords
            const allKeywordAndHeadings = [..._allKeywords, ...headings];

            // Tìm partial match dài nhất từ text trước cursor
            interface BestMatchType {
                keyword: { text: string; type: string };
                startColumn: number;
                matchedText: string;
                score: number; // Thêm score để rank
            }
            let bestMatch: BestMatchType | null = null;

            // Helper: Fuzzy match - check if searchWords match keyword (any order)
            const fuzzyMatch = (keyword: string, searchWords: string[]): { match: boolean; score: number } => {
                const kwLower = keyword.toLowerCase();
                let matchedCount = 0;
                let totalPosition = 0; // Tổng vị trí các từ match để tính score

                // Check từng word có tồn tại trong keyword không (bất kể thứ tự)
                for (const word of searchWords) {
                    const wordLower = word.toLowerCase();
                    const foundIndex = kwLower.indexOf(wordLower);

                    if (foundIndex !== -1) {
                        matchedCount++;
                        totalPosition += foundIndex; // Cộng vị trí để ưu tiên từ ở đầu
                    } else {
                        // Word không tìm thấy
                        return { match: false, score: 0 };
                    }
                }

                // Score: cao hơn nếu match nhiều words và các từ ở gần đầu keyword
                const score = matchedCount * 1000 - totalPosition;
                return { match: true, score };
            };

            // Get search words from text before cursor
            const textTrimmed = textBeforeCursor.trim();
            const wordsInText = textTrimmed ? textTrimmed.split(/\s+/) : [];

            // Try fuzzy matching với từng word combination từ cuối text
            // Track tất cả matches, không chỉ best match
            interface MatchResult {
                keyword: { text: string; type: string; link?: string };
                startColumn: number;
                matchedText: string;
                score: number;
            }
            const allMatches: MatchResult[] = [];

            allKeywordAndHeadings.forEach((kw) => {
                if (!textTrimmed) {
                    // Nếu chưa gõ gì, show all _allKeywords
                    allMatches.push({
                        keyword: kw,
                        startColumn: position.column,
                        matchedText: "",
                        score: 0,
                    });
                    return;
                }

                // Thử fuzzy match với các word combinations từ cuối text
                for (let wordCount = wordsInText.length; wordCount > 0; wordCount--) {
                    const searchWords = wordsInText.slice(-wordCount);
                    const phrase = searchWords.join(" ");

                    // Fuzzy match
                    const { match, score } = fuzzyMatch(kw.text, searchWords);

                    if (match) {
                        // Tìm vị trí bắt đầu của phrase trong text
                        const phraseStartInText = textBeforeCursor.lastIndexOf(phrase);

                        if (phraseStartInText !== -1) {
                            // Check word boundary
                            const charBefore = phraseStartInText > 0 ? textBeforeCursor[phraseStartInText - 1] : " ";

                            if (charBefore === " " || phraseStartInText === 0 || /\s/.test(charBefore)) {
                                // Add to matches
                                allMatches.push({
                                    keyword: kw,
                                    startColumn: phraseStartInText + 1,
                                    matchedText: phrase,
                                    score: score,
                                });
                                // Đã match, break để thử keyword tiếp theo
                                break;
                            }
                        }
                    }
                }
            });

            // Sort matches by score (cao nhất trước)
            allMatches.sort((a, b) => b.score - a.score);

            // Determine start column - use first match or cursor position
            const startColumn = allMatches.length > 0 && allMatches[0].matchedText ? allMatches[0].startColumn : position.column;

            // Check if user already typed opening bracket
            const hasOpeningBracket = textBeforeCursor.trimEnd().endsWith("[") || (startColumn > 1 && lineContent[startColumn - 2] === "[");

            const suggestions = allMatches.map((matchResult) => {
                const kw = matchResult.keyword;
                // Icon dựa trên type
                let kind = $mi.languages.CompletionItemKind.Keyword;
                if (kw.type === "hashtag") kind = $mi.languages.CompletionItemKind.Color;
                if (kw.type === "status") kind = $mi.languages.CompletionItemKind.Enum;
                if (kw.type === "class") kind = $mi.languages.CompletionItemKind.Class;
                if (kw.type === "type") kind = $mi.languages.CompletionItemKind.Interface;
                if (kw.type.startsWith("heading-")) kind = $mi.languages.CompletionItemKind.Reference; // Heading icon

                // insertText is kw.text which already includes [name][nameIndex]
                let insertText = kw.text;
                let rangeStartColumn = startColumn;

                if (hasOpeningBracket) {
                    // User already typed '[', remove the first '[' from insertText
                    insertText = kw.text.substring(1);
                    rangeStartColumn = startColumn;
                }

                // Range phải thay thế từ đầu partial match đến cursor
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: rangeStartColumn,
                    endColumn: position.column,
                };

                // Build documentation with type and link
                const documentation = kw.link 
                    ? `Type: ${kw.type}\nLink: ${kw.link}` 
                    : `Type: ${kw.type}`;
                
                // Build detail with type and link
                const detail = kw.link 
                    ? `${kw.type} • ${kw.link}` 
                    : `${kw.type} keyword`;

                return {
                    label: kw.text,
                    kind: kind,
                    insertText: insertText,
                    range,
                    documentation,
                    detail,
                    sortText: `${1000 - matchResult.score}${kw.text}`, // Sort by score (higher first)
                };
            });

            return { suggestions };
        },
    });

    return () => disposable.dispose();
}

/**
 * Setup definition provider with dynamic heading extraction and cross-note navigation
 */
export function setupDefinitionProvider(
    $mi: Monaco | null,
    editor: _monaco.editor.IStandaloneCodeEditor,
    _allKeywords: Array<{ text: string; type: string }>,
    noteId?: number,
    onNavigateToNote?: (targetNoteId: number, headingPath: string) => void
) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerDefinitionProvider("markdown", {
        provideDefinition: (model, position) => {
            // Dynamically extract headings from current text
            const currentText = model.getValue();
            const headings = extractHeadingsAsKeywords(currentText, noteId);

            // Merge with static _allKeywords
            const allKeywordAndHeadings = [..._allKeywords, ...headings];

            // Get line content to check for _allKeywords or wiki-style links
            const lineContent = model.getLineContent(position.lineNumber);
            const clickColumn = position.column;

            // Strategy 0: Check if clicking on [[name|link]] wiki-style link (original format)
            // This handles the case where user is viewing original content
            // Pattern: [[name|link]] (both external and internal)
            const wikiLinkRegex = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
            let wikiMatch;

            while ((wikiMatch = wikiLinkRegex.exec(lineContent)) !== null) {
                const startIndex = wikiMatch.index;
                const endIndex = startIndex + wikiMatch[0].length;
                const name = wikiMatch[1];
                const link = wikiMatch[2];

                // Check if cursor is within this link (1-based columns)
                if (clickColumn >= startIndex + 1 && clickColumn <= endIndex + 1) {
                    // Don't navigate here - navigation is handled by mouse click event
                    // This is only for preview/peek functionality
                }
            }

            // Try to find multi-word keyword at cursor position in [keyword] format
            let keyword: { text: string; type: string; path?: string } | null = null;
            let matchRange: { startColumn: number; endColumn: number } | null = null;

            // Check each keyword to see if cursor is within keyword pattern
            for (const kw of allKeywordAndHeadings) {
                // Match keyword pattern (kw.text already includes [name][nameIndex])
                const pattern = escapeRegex(kw.text);
                const regex = new RegExp(pattern, "gi");

                let match;
                while ((match = regex.exec(lineContent)) !== null) {
                    const startIndex = match.index;
                    const endIndex = startIndex + match[0].length;

                    // Check if cursor is within this keyword (1-based columns)
                    if (clickColumn >= startIndex + 1 && clickColumn <= endIndex + 1) {
                        keyword = kw;
                        matchRange = {
                            startColumn: startIndex + 1,
                            endColumn: endIndex + 1,
                        };
                        break;
                    }
                }

                if (keyword) break;
            }

            if (!keyword) {
                return null;
            }

            // Navigation is handled by mouse click event in useMonacoEditorHelper
            // This definition provider is only for preview/peek functionality

            // Check if this is a cross-note reference (path with different noteId)
            // Type assertion: keyword from headings will have 'path' property
            const keywordWithPath = keyword as { text: string; type: string; path?: string };

            if (keywordWithPath.path) {
                const pathMatch = keywordWithPath.path.match(/^super-app\/(\d+)\//);
                if (pathMatch) {
                    const targetNoteId = parseInt(pathMatch[1], 10);

                    // If target noteId is different from current noteId, it's a cross-note reference
                    if (noteId && targetNoteId !== noteId && onNavigateToNote) {
                        // Trigger navigation callback
                        onNavigateToNote(targetNoteId, keywordWithPath.path || "");

                        // Return null to prevent default navigation
                        return null;
                    }
                }
            }

            const text = model.getValue();
            const lines = text.split("\n");

            // Strategy 1: Look for EXACT heading match (# Title)
            // This is highest priority for title-based navigation
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim(); // Trim to handle CRLF
                const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

                if (headingMatch) {
                    const title = headingMatch[2].trim();
                    // Remove markdown formatting
                    const cleanTitle = title
                        .replace(/\*\*(.+?)\*\*/g, "$1")
                        .replace(/\*(.+?)\*/g, "$1")
                        .replace(/__(.+?)__/g, "$1")
                        .replace(/_(.+?)_/g, "$1")
                        .replace(/`(.+?)`/g, "$1")
                        .replace(/~~(.+?)~~/g, "$1")
                        .trim();

                    // Check for exact match (case-insensitive)
                    if (cleanTitle.toLowerCase() === keyword.text.toLowerCase()) {
                        const lineNumber = i + 1;
                        const originalLine = lines[i]; // Get original line for column calculation
                        const startColumn = originalLine.indexOf("#") + 1;
                        const endColumn = originalLine.trimEnd().length + 1;

                        return {
                            uri: model.uri,
                            range: {
                                startLineNumber: lineNumber,
                                startColumn: startColumn,
                                endLineNumber: lineNumber,
                                endColumn: endColumn,
                            },
                        };
                    }
                }
            }

            // Strategy 2: Look for explicit definition comment
            // Format: <!-- Define: keyword --> or <!--Define:keyword-->
            const defineCommentRegex = new RegExp(`<!--\\s*Define\\s*:\\s*${escapeRegex(keyword.text)}\\s*-->`, "i");
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

            // Strategy 3: Look for heading that CONTAINS the keyword (partial match)
            // Format: # My keyword explanation
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

            // Strategy 4: Find first occurrence (fallback)
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
 * Setup folding provider for markdown headings
 */
export function setupMarkdownFolding($mi: Monaco | null, editor: _monaco.editor.IStandaloneCodeEditor) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerFoldingRangeProvider("markdown", {
        provideFoldingRanges: (model) => {
            const lines = model.getLinesContent();
            const foldingRanges: _monaco.languages.FoldingRange[] = [];
            const headingStack: Array<{ level: number; line: number }> = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const headingMatch = line.match(/^(#{1,6})\s/);

                if (headingMatch) {
                    const level = headingMatch[1].length;
                    const lineNumber = i + 1;

                    // Close all headings of equal or lower level
                    while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
                        const parent = headingStack.pop()!;
                        foldingRanges.push({
                            start: parent.line,
                            end: i, // End at line before this heading
                            kind: $mi.languages.FoldingRangeKind.Region,
                        });
                    }

                    // Add current heading to stack
                    headingStack.push({ level, line: lineNumber });
                }
            }

            // Close remaining headings at end of document
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

export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract external links from markdown text
 * Format: [[name|url]] where url starts with http:// or https://
 * @param text - Markdown text
 * @returns Array of {name, url} objects
 */
export function extractExternalLinks(text: string): Array<{ name: string; url: string }> {
    const externalLinks: Array<{ name: string; url: string }> = [];

    // Regex to match [[name|link]] pattern
    const linkRegex = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
        const name = match[1].trim();
        const link = match[2].trim();

        // Only include external links (those starting with http:// or https://)
        if (name && link && (link.startsWith("http://") || link.startsWith("https://"))) {
            externalLinks.push({ name, url: link });
        }
    }

    return externalLinks;
}

/**
 * Convert original version (with keyword IDs) to display version (with [name][nameIndex])
 * Original: [[123]] (keyword ID with double brackets)
 * Display: [Introduction][1]
 *
 * @param text - Original markdown with [[id]] format
 * @param allKeywords - All keywords with id, name, nameIndex
 * @returns Display text with [name][nameIndex]
 */
export function convertToDisplayVersion(text: string, allKeywords: Array<{ id: number; name: string; nameIndex: number }>): string {
    if (!allKeywords || allKeywords.length === 0) return text;

    // Build a map of keyword id -> [name][nameIndex] for fast lookup
    const keywordMap = new Map<number, string>();
    allKeywords.forEach((kw) => {
        keywordMap.set(kw.id, `[${kw.name}][${kw.nameIndex}]`);
    });

    // Replace [[id]] with [name][nameIndex]
    return text.replace(/\[\[(\d+)\]\]/g, (match, idStr) => {
        const id = parseInt(idStr, 10);
        const displayText = keywordMap.get(id);
        return displayText || match; // Keep original if not found
    });
}

/**
 * Convert display version (with [name][nameIndex]) to original version (with keyword IDs)
 * Display: [Introduction][1]
 * Original: [[123]] (keyword ID with double brackets)
 *
 * @param text - Display text with [name][nameIndex] format
 * @param allKeywords - All keywords with id, name, nameIndex
 * @returns Original markdown with [[id]] format
 */
export function convertToOriginalVersion(text: string, allKeywords: Array<{ id: number; name: string; nameIndex: number }>): string {
    if (!allKeywords || allKeywords.length === 0) return text;

    // Build a map of [name][nameIndex] (lowercase) -> id for fast lookup
    const keywordIdMap = new Map<string, number>();
    allKeywords.forEach((kw) => {
        const key = `[${kw.name}][${kw.nameIndex}]`.toLowerCase();
        keywordIdMap.set(key, kw.id);
    });

    // Replace [name][nameIndex] with [[id]]
    // Pattern: [name][number]
    return text.replace(/\[([^\]]+)\]\[(\d+)\]/g, (match, name, nameIndex) => {
        const key = `[${name}][${nameIndex}]`.toLowerCase();
        const id = keywordIdMap.get(key);
        return id !== undefined ? `[[${id}]]` : match; // Keep original if not found
    });
}

/**
 * Extract all headings from markdown text as _allKeywords with hierarchical paths
 * @param text - Markdown text
 * @param noteId - Current note ID for generating full paths
 */
export function extractHeadingsAsKeywords(text: string, noteId?: number): Array<{ text: string; type: string; line: number; path?: string }> {
    const lines = text.split("\n");
    const headings: Array<{ text: string; type: string; line: number; path?: string }> = [];

    // Track heading hierarchy for path generation
    const headingStack: Array<{ level: number; title: string }> = [];

    lines.forEach((line, index) => {
        // Trim to handle Windows CRLF line endings
        const trimmedLine = line.trim();

        // Match markdown headings: # Title or ## Title, etc.
        const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);

        if (headingMatch) {
            const level = headingMatch[1].length;
            const title = headingMatch[2].trim();

            // Remove any markdown formatting from title (bold, italic, code, etc.)
            const cleanTitle = title
                .replace(/\*\*(.+?)\*\*/g, "$1") // Bold
                .replace(/\*(.+?)\*/g, "$1") // Italic
                .replace(/__(.+?)__/g, "$1") // Bold alt
                .replace(/_(.+?)_/g, "$1") // Italic alt
                .replace(/`(.+?)`/g, "$1") // Code
                .replace(/~~(.+?)~~/g, "$1") // Strikethrough
                .trim();

            if (cleanTitle) {
                // Pop headings from stack until we find parent (lower level number)
                while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
                    headingStack.pop();
                }

                // Build hierarchical path
                const pathParts = headingStack.map((h) => h.title);
                pathParts.push(cleanTitle);

                // Generate path: noteId/title1/title2/title3
                const fullPath = noteId ? `${noteId}/${pathParts.join("/")}` : pathParts.join("/");

                headings.push({
                    text: cleanTitle,
                    type: `heading-${level}`,
                    line: index + 1, // Monaco uses 1-based line numbers
                    path: fullPath,
                });

                // Add current heading to stack
                headingStack.push({ level, title: cleanTitle });
            }
        }
    });

    return headings;
}

/**
 * Setup hover provider with dynamic heading extraction
 */
/**
 * Setup link provider for Ctrl+hover behavior (underline + pointer cursor)
 */
export function setupLinkProvider(
    $mi: Monaco | null,
    editor: _monaco.editor.IStandaloneCodeEditor,
    _allKeywords: Array<{ text: string; type: string }>,
    noteId?: number
) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerLinkProvider("markdown", {
        provideLinks: (model) => {
            // Dynamically extract headings from current text
            const currentText = model.getValue();
            const headings = extractHeadingsAsKeywords(currentText, noteId);

            // Merge with static _allKeywords
            const allKeywordAndHeadings = [..._allKeywords, ...headings];

            const links: _monaco.languages.ILink[] = [];

            // Find all keyword patterns
            allKeywordAndHeadings.forEach((kw) => {
                // Match keyword pattern (kw.text already includes [name][nameIndex])
                const regex = new RegExp(escapeRegex(kw.text), "gi");
                let match;

                while ((match = regex.exec(currentText)) !== null) {
                    const startPos = model.getPositionAt(match.index);
                    const endPos = model.getPositionAt(match.index + match[0].length);

                    links.push({
                        range: {
                            startLineNumber: startPos.lineNumber,
                            startColumn: startPos.column,
                            endLineNumber: endPos.lineNumber,
                            endColumn: endPos.column,
                        },
                        url: `keyword://${kw.text}`, // Dummy URL for link detection
                    });
                }
            });

            // Also detect wiki-style links [[name|link]]
            const wikiLinkRegex = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
            let wikiMatch;

            while ((wikiMatch = wikiLinkRegex.exec(currentText)) !== null) {
                const startPos = model.getPositionAt(wikiMatch.index);
                const endPos = model.getPositionAt(wikiMatch.index + wikiMatch[0].length);

                links.push({
                    range: {
                        startLineNumber: startPos.lineNumber,
                        startColumn: startPos.column,
                        endLineNumber: endPos.lineNumber,
                        endColumn: endPos.column,
                    },
                    url: wikiMatch[2], // Use actual link
                });
            }

            return { links };
        },
    });

    return () => disposable.dispose();
}

export function setupHoverProvider(
    $mi: Monaco | null,
    editor: _monaco.editor.IStandaloneCodeEditor,
    _allKeywords: Array<{ text: string; type: string }>,
    noteId?: number
) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerHoverProvider("markdown", {
        provideHover: (model, position) => {
            // Dynamically extract headings from current text
            const currentText = model.getValue();
            const headings = extractHeadingsAsKeywords(currentText, noteId);

            // Merge with static _allKeywords
            const allKeywordAndHeadings = [..._allKeywords, ...headings];

            // Get line content to check for multi-word _allKeywords
            const lineContent = model.getLineContent(position.lineNumber);
            const hoverColumn = position.column;

            // Try to find multi-word keyword at cursor position in [keyword] format
            let keyword = null;
            let matchRange = null;

            // Check each keyword to see if cursor is within keyword pattern
            for (const kw of allKeywordAndHeadings) {
                // Match keyword pattern (kw.text already includes [name][nameIndex])
                const pattern = escapeRegex(kw.text);
                const regex = new RegExp(pattern, "gi");

                let match;
                while ((match = regex.exec(lineContent)) !== null) {
                    const startIndex = match.index;
                    const endIndex = startIndex + match[0].length;

                    // Check if cursor is within this keyword (1-based columns)
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
                contents: [{ value: `**${keyword.text}**` }, { value: `Type: \`${keyword.type}\`` }, { value: `_Click to go to definition (Ctrl+Click or F12)_` }],
            };
        },
    });

    return () => disposable.dispose();
}
