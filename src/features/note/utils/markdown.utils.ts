import type * as _monaco from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";
import {Keyword} from "@/shared";

/**
 * Update decorations (highlight _allKeywords and URLs)
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
        console.warn('⚠️ [DECORATIONS] No model found, aborting');
        return;
    }

    // Highlight _allKeywords in [name] format (REMOVED nameIndex)
    // If keyword is in allKeywords, it will be decorated
    // Headings are no longer tracked as keywords
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

    // Wiki-style links [[name|link]] - NO DECORATIONS
    // External links are displayed as plain text without any styling
    // They will be converted to [[id]] format by backend after saving

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


// =====================================================
// HELPER FUNCTIONS - Autocomplete
// =====================================================

type KeywordWithDetails = {
    text: string;
    type: string;
    link?: string;
    longLink?: string;
    name?: string;
    nameIndex?: number;
    hardDeletedAt?: Date | null;
    [key: string]: any;
};

/**
 * HELPER: Kiểm tra keyword có bị hard deleted không
 * Keywords bị hard deleted sẽ vẫn được render trong editor nhưng không xuất hiện trong autocomplete
 */
function isKeywordHardDeleted(kw: KeywordWithDetails): boolean {
    return kw.hardDeletedAt !== null && kw.hardDeletedAt !== undefined;
}

/**
 * HELPER: Lấy text để match với user input (dùng name nếu có, fallback về text)
 */
function getKeywordMatchTarget(kw: KeywordWithDetails): string {
    return kw.name || kw.text;
}

/**
 * HELPER: Kiểm tra keyword type có phải là heading không
 * REMOVED: heading types no longer used
 */
// function isHeadingType(type: string): boolean {
//     return type === "h1" || type === "h2" || type === "h3" ||
//            type === "h4" || type === "h5" || type === "h6";
// }

/**
 * HELPER: Xác định icon cho từng keyword type trong autocomplete dropdown
 */
function getCompletionItemKind($mi: Monaco, keywordType: string): any {
    switch (keywordType) {
        case "workspace":
            return $mi.languages.CompletionItemKind.Constructor;
        case "folder":
            return $mi.languages.CompletionItemKind.Folder;
        case "note":
        case "file":
            return $mi.languages.CompletionItemKind.File;
        // REMOVED: heading types no longer used
        // case "h1":
        // case "h2":
        // case "h3":
        // case "h4":
        // case "h5":
        // case "h6":
        //     return $mi.languages.CompletionItemKind.Unit;
        case "external":
            return $mi.languages.CompletionItemKind.Reference;
        default:
            return $mi.languages.CompletionItemKind.Value;
    }
}

/**
 * HELPER: Xác định text sẽ được insert khi user chọn suggestion
 *
 * Logic:
 * - Nếu đang gõ trong dòng heading (#...) → LUÔN insert plain name (bất kể keyword type)
 *   Ví dụ: "# w1" + Tab → "w1", "# note1" + Tab → "note1"
 * - Nếu gõ ngoài dòng heading → insert format [name]nameIndex (reference keyword)
 *   Ví dụ: "see w1" + Tab → "[w1]1", "see note1" + Tab → "[note1]2"
 */
function determineInsertText(kw: KeywordWithDetails, isInHeading: boolean): string {
    // Nếu keyword không có name → dùng text mặc định
    if (!kw.name) {
        return kw.text;
    }

    // QUAN TRỌNG: Nếu đang gõ trong dòng heading → LUÔN insert plain name
    if (isInHeading) {
        return kw.name;
    }

    // Nếu gõ ngoài dòng heading → insert format [name]
    // REMOVED: nameIndex no longer used
    // return `[${kw.name}]${kw.nameIndex}`;
    return `[${kw.name}]`;
}

/**
 * HELPER: Build documentation và detail cho suggestion item
 *
 * - documentation: hiển thị trong tooltip khi hover
 * - detail: hiển thị bên phải item trong dropdown
 * - displayLabel: hiển thị trong dropdown (chỉ name, không có brackets)
 */
function buildCompletionItemDetails(kw: KeywordWithDetails) {
    const fullPath = kw.longLink || kw.link || '';

    // Loại bỏ phần name (phần cuối) khỏi longLink để hiển thị path
    // Ví dụ: "Workspace[1]/Folder[2]/NoteName[3]" → "Workspace[1]/Folder[2]"
    let displayPath = '';
    if (fullPath) {
        const parts = fullPath.split('/');
        if (parts.length > 1) {
            parts.pop(); // Xóa phần cuối (name)
            displayPath = parts.join('/');
        }
    }

    return {
        documentation: displayPath ? `Type: ${kw.type}\nPath: ${displayPath}` : `Type: ${kw.type}`,
        detail: displayPath || undefined, // undefined để ẩn nếu không có path
        displayLabel: kw.name || kw.text,
    };
}

/**
 * HELPER: Thực hiện fuzzy matching với tất cả keywords
 *
 * Logic:
 * 1. Nếu chưa gõ gì → show tất cả keywords (trừ hardDeleted)
 * 2. Nếu đã gõ → fuzzy match với từng word combination từ cuối text
 * 3. Tìm vị trí bắt đầu của match để xác định range thay thế
 */
function findMatchingKeywords(
    keywords: KeywordWithDetails[],
    textBeforeCursor: string,
    cursorColumn: number
): MatchResult[] {
    const textTrimmed = textBeforeCursor.trim();
    const wordsInText = textTrimmed ? textTrimmed.split(/\s+/) : [];
    const allMatches: MatchResult[] = [];

    keywords.forEach((kw) => {
        // BƯỚC 1: Lọc bỏ keywords đã bị hard deleted
        if (isKeywordHardDeleted(kw)) {
            return;
        }

        // BƯỚC 2: Nếu chưa gõ gì → show tất cả keywords
        if (!textTrimmed) {
            allMatches.push({
                keyword: kw,
                startColumn: cursorColumn,
                matchedText: '',
                score: 0,
            });
            return;
        }

        // BƯỚC 3: Fuzzy match với các word combinations từ cuối text
        // Ví dụ: "hello w1 no" → thử match ["hello", "w1", "no"], ["w1", "no"], ["no"]
        for (let wordCount = wordsInText.length; wordCount > 0; wordCount--) {
            const searchWords = wordsInText.slice(-wordCount);
            const phrase = searchWords.join(' ');

            // Lấy text để match (name nếu có, fallback về text)
            const matchTarget = getKeywordMatchTarget(kw);

            // Thực hiện fuzzy match
            const { match, score } = fuzzyMatch(matchTarget, searchWords);

            if (match) {
                // Tìm vị trí bắt đầu của phrase trong text
                const phraseStartInText = textBeforeCursor.lastIndexOf(phrase);

                if (phraseStartInText !== -1) {
                    // Kiểm tra word boundary (đảm bảo không match giữa chừng từ)
                    const charBefore = phraseStartInText > 0 ? textBeforeCursor[phraseStartInText - 1] : ' ';

                    if (charBefore === ' ' || phraseStartInText === 0 || /\s/.test(charBefore)) {
                        allMatches.push({
                            keyword: kw,
                            startColumn: phraseStartInText + 1,
                            matchedText: phrase,
                            score: score,
                        });
                        // Đã match → break để thử keyword tiếp theo
                        break;
                    }
                }
            }
        }
    });

    return allMatches;
}

/**
 * HELPER: Xử lý opening bracket nếu user đã gõ sẵn
 *
 * Logic: Nếu user đã gõ '[' thì bỏ '[' ở đầu insertText để tránh bị duplicate
 */
function handleOpeningBracket(
    insertText: string,
    hasOpeningBracket: boolean,
    isInHeading: boolean
): string {
    // Chỉ xử lý opening bracket nếu KHÔNG phải dòng heading
    if (hasOpeningBracket && !isInHeading) {
        // User đã gõ '[' → bỏ '[' ở đầu insertText
        return insertText.substring(1);
    }
    return insertText;
}

// =====================================================
// MAIN FUNCTION - Setup Autocomplete Provider
// =====================================================

/**
 * Setup autocomplete provider cho Monaco Editor
 *
 * Autocomplete hiển thị danh sách keywords gợi ý khi user gõ text.
 * Hỗ trợ:
 * - Fuzzy matching (gõ "w1 no" match "w1-note")
 * - Context-aware insertion (tạo heading mới vs reference keyword)
 * - Lọc hardDeleted keywords
 * - Hiển thị icon, path, documentation
 */
export function setupAutocomplete(
    $mi: Monaco | null,
    editor: _monaco.editor.IStandaloneCodeEditor,
    _allKeywords: Array<{ text: string; type: string; link?: string; longLink?: string; name?: string; nameIndex?: number }>,
    noteId?: number
) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerCompletionItemProvider('markdown', {
        // Trigger characters: các ký tự sẽ kích hoạt autocomplete
        triggerCharacters: ['#', '@', '[', ' ', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],

        provideCompletionItems: (model: any, position: any) => {
            // ========== BƯỚC 1: LẤY CONTEXT HIỆN TẠI ==========
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);

            // Kiểm tra có đang gõ trong external link format [[name|url]] không
            // If typing external link, don't show autocomplete suggestions
            const externalLinkPattern = /\[\[([^|\]]*)\|([^\]]*)$/;
            const isInExternalLink = externalLinkPattern.test(textBeforeCursor);

            if (isInExternalLink) {
                return { suggestions: [] }; // No suggestions for external links
            }

            // Kiểm tra có đang gõ trong dòng heading không (dòng bắt đầu bằng #)
            const isInHeading = /^#{1,6}\s+/.test(lineContent.trim());

            // ========== BƯỚC 2: TÌM KEYWORDS MATCHING ==========
            const allMatches = findMatchingKeywords(
                _allKeywords as KeywordWithDetails[],
                textBeforeCursor,
                position.column
            );

            // ========== BƯỚC 3: SẮP XẾP MATCHES THEO SCORE ==========
            // Score cao hơn = match tốt hơn → sắp xếp lên đầu
            allMatches.sort((a, b) => b.score - a.score);

            // ========== BƯỚC 4: XÁC ĐỊNH START COLUMN ==========
            // Start column là vị trí bắt đầu của text sẽ bị thay thế
            const startColumn = allMatches.length > 0 && allMatches[0].matchedText
                ? allMatches[0].startColumn
                : position.column;

            // Kiểm tra user đã gõ '[' chưa
            const hasOpeningBracket = textBeforeCursor.trimEnd().endsWith('[') ||
                                     (startColumn > 1 && lineContent[startColumn - 2] === '[');

            // ========== BƯỚC 5: BUILD SUGGESTION ITEMS ==========
            const suggestions = allMatches.map((matchResult) => {
                const kw = matchResult.keyword as KeywordWithDetails;

                // BƯỚC 5.1: Xác định icon cho keyword type
                const kind = getCompletionItemKind($mi, kw.type);

                // BƯỚC 5.2: Xác định text sẽ insert (dựa trên context và type)
                let insertText = determineInsertText(kw, isInHeading);

                // BƯỚC 5.3: Xử lý opening bracket nếu user đã gõ sẵn
                insertText = handleOpeningBracket(insertText, hasOpeningBracket, isInHeading);

                // BƯỚC 5.4: Xác định range sẽ thay thế (từ start column đến cursor)
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: startColumn,
                    endColumn: position.column,
                };

                // BƯỚC 5.5: Build documentation, detail, label
                const { documentation, detail, displayLabel } = buildCompletionItemDetails(kw);

                // BƯỚC 5.6: Return suggestion item
                return {
                    label: displayLabel,
                    kind: kind,
                    insertText: insertText,
                    range,
                    documentation,
                    detail, // Monaco hiển thị bên phải item
                    sortText: `${1000 - matchResult.score}${displayLabel}`, // Sắp xếp theo score (cao hơn lên đầu)
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

            // Wiki-style links [[name|link]] are treated as plain text
            // No preview/peek functionality for external links

            // Try to find multi-word keyword at cursor position in [keyword] format
            let keyword: { text: string; type: string; path?: string } | null = null;
            let matchRange: { startColumn: number; endColumn: number } | null = null;

            // Check each keyword to see if cursor is within keyword pattern
            for (const kw of _allKeywords) {
                // Match keyword pattern (kw.text includes [name], REMOVED nameIndex)
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
 * Convert original version (with keyword IDs) to display version (with [name])
 * Original: [[123]] (keyword ID with double brackets)
 * Display: [Introduction]
 *
 * @param text - Original markdown with [[id]] format
 * @param allKeywords - All keywords with id, name
 * @returns Display text with [name]
 */
export function convertToDisplayVersion(text: string, allKeywords: Array<{ id: number; name: string; nameIndex?: number }>): string|null {
    if (!allKeywords || allKeywords.length === 0) {
        return null; //* khi nào có keywords thì mới convert và display UI, còn k thì để null, UI = loading
    }
    // Build a map of keyword id -> display format
    const keywordMap = new Map<number, string>();
    allKeywords.forEach((kw) => {
        // REMOVED: nameIndex no longer used in display format
        // const displayText = `[${kw.name}]${kw.nameIndex}`;
        const displayText = `[${kw.name}]`;
        keywordMap.set(kw.id, displayText);
    });

    // Replace [[id]] with [name]
    const result = text.replace(/\[\[(\d+)\]\]/g, (match, idStr) => {
        const id = parseInt(idStr, 10);
        const displayText = keywordMap.get(id);
        return displayText || match; // Keep original if not found
    });


    if(result.includes("[[") || result.includes("]]")){
        return null;
    }


    return result;
}

/**
 * Convert display version (with [name]) to original version (with keyword IDs)
 * Display: [Introduction]
 * Original: [[123]] (keyword ID with double brackets)
 *
 * @param text - Display text with [name] format
 * @param allKeywords - All keywords with id, name
 * @returns Original markdown with [[id]] format
 */
export function convertToOriginalVersion(text: string, allKeywords: Array<{ id: number; name: string; nameIndex?: number }>): string|null {
    if (!allKeywords || allKeywords.length === 0) return null

    // Build map for lookup: [name] -> id
    const keywordIdMap = new Map<string, number>();

    allKeywords.forEach((kw) => {
        // REMOVED: nameIndex no longer used in key
        // const key = `[${kw.name}]${kw.nameIndex}`.toLowerCase();
        const key = `[${kw.name}]`.toLowerCase();
        keywordIdMap.set(key, kw.id);
    });

    // Replace [name] with [[id]]
    // Pattern: [name] where name can contain any chars except ]
    const result = text.replace(/\[([^\]]+)\]/g, (match, name) => {
        // REMOVED: old pattern matched [name]number - now just [name]
        const key = `[${name}]`.toLowerCase();
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
 * Also handles click navigation
 */
export function setupLinkProvider(
    $mi: Monaco | null,
    editor: _monaco.editor.IStandaloneCodeEditor,
    _allKeywords: Array<Keyword>,
    navigateLink: (keyword: Keyword) => void,
    _console: any,
    noteId?: number
) {
    if (!$mi) return () => {};

    // Register link provider for underline + pointer cursor
    const linkProviderDisposable = $mi.languages.registerLinkProvider("markdown", {
        provideLinks: (model) => {
            const currentText = model.getValue();
            const links: _monaco.languages.ILink[] = [];

            // Find all keyword patterns
            _allKeywords.forEach((kw) => {
                // Match keyword pattern [name] (REMOVED nameIndex)
                // const displayName = `[${kw.name}]${kw.nameIndex}`;
                const displayName = `[${kw.name}]`;
                const regex = new RegExp(escapeRegex(displayName), "gi");
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
                        url: `keyword://${displayName}`, // Dummy URL for link detection
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

    // Register click handler for navigation (CHỈ khi click vào keyword)
    const clickDisposable = editor.onMouseDown((e) => {
        if (!e.event.ctrlKey && !e.event.metaKey) return; // Only handle Ctrl+Click or Cmd+Click
        const position = e.target.position;
        if (!position) {
            return;
        }

        const model = editor.getModel();
        if (!model) {
            return;
        }

        const lineContent = model.getLineContent(position.lineNumber);
        const clickColumn = position.column;

        // Check if clicking on keyword - tìm keyword chứa vị trí click
        let foundMatch = false;

        for (const kw of _allKeywords) {
            // Match keyword pattern [name] (REMOVED nameIndex)
            // const displayName = `[${kw.name}]${kw.nameIndex}`;
            const displayName = `[${kw.name}]`;
            const regex = new RegExp(escapeRegex(displayName), "gi");
            let match;

            while ((match = regex.exec(lineContent)) !== null) {
                const startIndex = match.index;
                const endIndex = startIndex + match[0].length;

                // Check if click is within this keyword (1-based columns)
                if (clickColumn >= startIndex + 1 && clickColumn <= endIndex + 1) {
                    // Found keyword at click position - navigate
                    if(kw.link && kw.hardDeletedAt) {
                        // do nothing
                        _console.warning("Keyword is deleted or not existed.");
                        foundMatch = true;
                        return;
                    }else if (kw.link && !kw.hardDeletedAt) {
                        navigateLink(kw);
                        e.event.preventDefault();
                        e.event.stopPropagation();
                        foundMatch = true;
                        return;
                    }
                }
            }
        }

        // Wiki-style links [[name|link]] are now treated as plain text
        // No click navigation for external links - they will be converted by backend

        if (!foundMatch) {
        }
    });

    // Return cleanup function
    return () => {
        linkProviderDisposable.dispose();
        clickDisposable.dispose();
    };
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
                // Match keyword pattern (kw.text includes [name], REMOVED nameIndex)
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
