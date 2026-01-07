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
    if (!model) {
        console.warn('⚠️ [DECORATIONS] No model found, aborting');
        return;
    }

    // Highlight _allKeywords in [name]nameIndex format (new format)
    // If keyword is in allKeywords, it will be decorated (including headings)
    // If heading text is NOT in allKeywords, it won't match and won't be decorated
    _allKeywords.forEach((kw, kwIndex) => {
        // Match keyword pattern: [name]number (e.g., [w1]2)
        const regex = new RegExp(escapeRegex(kw.text), "gi");
        let match;
        let matchCount = 0;

        while ((match = regex.exec(text)) !== null) {
            matchCount++;

            // New format: [name]number
            // Example: [w1]2
            // Parse: [ = bracket, w1 = name, ]2 = bracket + index
            const keywordText = match[0]; // e.g., "[w1]2"
            const nameMatch = keywordText.match(/^\[([^\]]+)\](\d+)$/);

            if (nameMatch) {
                const name = nameMatch[1]; // e.g., "w1"
                const nameIndex = nameMatch[2]; // e.g., "2"

                // Position calculations
                const bracketStartPos = match.index; // Position of "["
                const nameStartPos = match.index + 1; // Position of "w1"
                const nameEndPos = match.index + 1 + name.length; // End of "w1"
                const bracketEndAndIndexPos = nameEndPos; // Position of "]2"
                const fullEnd = match.index + keywordText.length;

                // Decoration 1: Opening bracket "[" - gray color, smaller font
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

                // Decoration 2: Name "w1" - white color, hover underline, cursor pointer
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

                // Decoration 3: Closing bracket "]" - gray color, smaller font
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

                // Decoration 4: Index number "2" - gray color, smaller font
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

        // if (matchCount === 0) {
        //     // console.log(`  ⚠️ No matches found for keyword "${kw.text}"`);
        // } else {
        //     // console.log(`  ✅ Total matches for "${kw.text}": ${matchCount}`);
        // }
    });

    // custom css URLs (http://, https://, ftp://)
    const urlRegex = /\b(https?|ftp):\/\/[^\s]+/gi;
    let urlMatch;
    let urlCount = 0;

    while ((urlMatch = urlRegex.exec(text)) !== null) {
        urlCount++;

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
    let wikiCount = 0;

    while ((wikiMatch = wikiLinkRegex.exec(text)) !== null) {
        wikiCount++;

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
    try {
        decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
    } catch (error) {
        console.error(`❌ [DECORATIONS] Failed to apply decorations:`, error);
    }
}

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

interface MatchResult {
    keyword: { text: string; type: string; link?: string };
    startColumn: number;
    matchedText: string;
    score: number;
}


/**
 * Setup autocomplete provider with dynamic heading extraction
 */
export function setupAutocomplete(
    $mi: Monaco | null,
    editor: _monaco.editor.IStandaloneCodeEditor,
    _allKeywords: Array<{ text: string; type: string; link?: string; longLink?: string; name?: string; nameIndex?: number }>,
    noteId?: number
) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerCompletionItemProvider("markdown", {
        // Trigger characters để autocomplete dễ xuất hiện hơn
        triggerCharacters: ["#", "@", "[", " ", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"],

        provideCompletionItems: (model: any, position: any) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);

            // Check if we're in a heading line (starts with #)
            const isInHeading = /^#{1,6}\s+/.test(lineContent.trim());

            // Get search words from text before cursor
            const textTrimmed = textBeforeCursor.trim();
            const wordsInText = textTrimmed ? textTrimmed.split(/\s+/) : [];

            // Try fuzzy matching với từng word combination từ cuối text
            // Track tất cả matches, không chỉ best match
            const allMatches: MatchResult[] = [];
            _allKeywords.forEach((kw) => {
                // Skip hardDeleted keywords in autocomplete (but still render them in editor)
                const kwWithDetails = kw as { text: string; type: string; hardDeletedAt?: Date | null; [key: string]: any };
                if (kwWithDetails.hardDeletedAt !== null && kwWithDetails.hardDeletedAt !== undefined) {
                    return; // Skip this keyword in autocomplete
                }

                if (!textTrimmed) {
                    // Nếu chưa gõ gì, show all _allKeywords (except hardDeleted)
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

                    // Get keyword name for matching (without brackets)
                    const kwWithDetails = kw as { text: string; type: string; link?: string; name?: string; nameIndex?: number };
                    const matchTarget = kwWithDetails.name || kw.text; // Use name if available, fallback to text

                    // Fuzzy match with keyword name (not brackets)
                    const { match, score } = fuzzyMatch(matchTarget, searchWords);

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
                
                // Get icon based on keyword type using mapping
                let kind = $mi.languages.CompletionItemKind.Value; // Default
                
                switch (kw.type) {
                    case "workspace":
                        kind = $mi.languages.CompletionItemKind.Constructor;
                        break;
                    case "folder":
                        kind = $mi.languages.CompletionItemKind.Folder;
                        break;
                    case "note":
                    case "file":
                        kind = $mi.languages.CompletionItemKind.File;
                        break;
                    case "h1":
                    case "h2":
                    case "h3":
                    case "h4":
                    case "h5":
                    case "h6":
                        kind = $mi.languages.CompletionItemKind.Unit;
                        break;
                    case "external":
                        kind = $mi.languages.CompletionItemKind.Reference;
                        break;
                    default:
                        kind = $mi.languages.CompletionItemKind.Value;
                        break;
                }

                // For autocomplete, insert format based on context and type
                // Check if kw has name and nameIndex properties (from _allKeywords)
                const kwWithDetails = kw as { text: string; type: string; link?: string; longLink?: string; name?: string; nameIndex?: number };
                let insertText = kw.text;

                // If this is from _allKeywords (has name/nameIndex)
                if (kwWithDetails.name && kwWithDetails.nameIndex !== undefined) {
                    // Check if keyword type is heading
                    const isHeadingType = kw.type === "h1" || kw.type === "h2" || kw.type === "h3" ||
                                         kw.type === "h4" || kw.type === "h5" || kw.type === "h6";

                    // Only insert plain name when BOTH: in heading line AND keyword is heading type
                    // This is for creating NEW headings (e.g., typing "# w1" to create a new h1 heading)
                    if (isInHeading && isHeadingType) {
                        insertText = kwWithDetails.name;
                    }
                    // For all other cases, insert full format [name]nameIndex:
                    // - Heading keywords referenced in normal lines (e.g., "see [w1]1")
                    // - Non-heading keywords in heading lines (e.g., "# See [note1]2")
                    // - Normal keywords in normal lines
                    else {
                        insertText = `[${kwWithDetails.name}]${kwWithDetails.nameIndex}`;
                    }
                }

                let rangeStartColumn = startColumn;

                // Only handle opening bracket if NOT in heading line
                if (hasOpeningBracket && !isInHeading) {
                    // User already typed '[', remove the first '[' from insertText
                    insertText = insertText.substring(1);
                    rangeStartColumn = startColumn;
                }

                // Range phải thay thế từ đầu partial match đến cursor
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: rangeStartColumn,
                    endColumn: position.column,
                };

                // Build documentation with type and longLink
                const fullPath = kwWithDetails.longLink || kw.link || '';
                
                // Remove name (last part) from longLink for display
                // Example: "Workspace[1]/Folder[2]/NoteName[3]" -> "Workspace[1]/Folder[2]"
                let displayLink = fullPath;
                if (fullPath) {
                    const parts = fullPath.split("/");
                    if (parts.length > 1) {
                        parts.pop(); // Remove last part (name)
                        displayLink = parts.join("/");
                    } else {
                        displayLink = ""; // If only one part, no parent path to show
                    }
                }
                
                const documentation = displayLink ? `Type: ${kw.type}\nPath: ${displayLink}` : `Type: ${kw.type}`;

                // Build detail - shows path without name, right-aligned automatically by Monaco
                const detail = displayLink || undefined; // undefined hides detail if no path

                // Label shows just the name (without brackets) for readability
                // But insertText includes full format [name][nameIndex]
                const displayLabel = kwWithDetails.name || kw.text;

                return {
                    label: displayLabel,
                    kind: kind,
                    insertText: insertText,
                    range,
                    documentation,
                    detail, // Monaco displays this on the right side
                    sortText: `${1000 - matchResult.score}${displayLabel}`, // Sort by score (higher first)
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
export function setupDefinitionProvider($mi: Monaco | null, editor: _monaco.editor.IStandaloneCodeEditor, _allKeywords: Array<{ text: string; type: string }>, noteId?: number) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerDefinitionProvider("markdown", {
        provideDefinition: (model, position) => {
            // Dynamically extract headings from current text
            const currentText = model.getValue();
            // const headings = extractHeadingsAsKeywords(currentText, noteId);

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
                // const name = wikiMatch[1];
                // const link = wikiMatch[2];

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
            for (const kw of _allKeywords) {
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

            // Navigation is handled by mouse click event
            // This definition provider is only for preview/peek functionality
            // Cross-note references are handled by navigateLink in click handler

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

    // Build a map of keyword id -> display format
    const keywordMap = new Map<number, string>();
    allKeywords.forEach((kw) => {
        // New format: [name]nameIndex (always show nameIndex, even if it's 1)
        const displayText = `[${kw.name}]${kw.nameIndex}`;
        keywordMap.set(kw.id, displayText);
    });

    // Replace [[id]] with [name]nameIndex
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

    // Build map for lookup: [name]nameIndex -> id
    const keywordIdMap = new Map<string, number>();

    allKeywords.forEach((kw) => {
        // New format: [name]nameIndex (e.g., [w1]2)
        const key = `[${kw.name}]${kw.nameIndex}`.toLowerCase();
        keywordIdMap.set(key, kw.id);
    });

    // Replace [name]nameIndex with [[id]]
    // Pattern: [name]123 where name can contain any chars except ]
    const result = text.replace(/\[([^\]]+)\](\d+)/g, (match, name, nameIndex) => {
        const key = `[${name}]${nameIndex}`.toLowerCase();
        const id = keywordIdMap.get(key);
        return id !== undefined ? `[[${id}]]` : match;
    });

    return result;
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
export function setupLinkProvider($mi: Monaco | null, editor: _monaco.editor.IStandaloneCodeEditor, _allKeywords: Array<{ text: string; type: string }>, noteId?: number) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerLinkProvider("markdown", {
        provideLinks: (model) => {
            // Dynamically extract headings from current text
            const currentText = model.getValue();
            // const headings = extractHeadingsAsKeywords(currentText, noteId);

            // Merge with static _allKeywords
            // const allKeywordAndHeadings = [..._allKeywords, ...headings];

            const links: _monaco.languages.ILink[] = [];

            // Find all keyword patterns
            _allKeywords.forEach((kw) => {
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

export function setupHoverProvider($mi: Monaco | null, editor: _monaco.editor.IStandaloneCodeEditor, _allKeywords: Array<{ text: string; type: string }>, noteId?: number) {
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
