
import { useEffect, useRef, useCallback } from "react";
import * as monaco from "monaco-editor";
import "@/styles/keywords.css";

const monacoEditor = monaco.editor;
const monacoLanguages = monaco.languages;


/**
 * Update decorations (highlight keywords and URLs)
 */
export function updateDecorations(
    editor: monaco.editor.IStandaloneCodeEditor,
    text: string,
    keywords: Array<{ text: string; type: string }>,
    decorationsRef: React.MutableRefObject<string[]>
) {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    const model = editor.getModel();
    if (!model) return;

    // Get all heading lines to skip decorating them
    const headingLines = new Set<number>();
    const lines = text.split('\n');
    lines.forEach((line, index) => {
        if (/^#{1,6}\s+/.test(line.trim())) {
            headingLines.add(index + 1); // Monaco uses 1-based line numbers
        }
    });

    // Highlight keywords
    keywords.forEach((kw) => {
        const regex = new RegExp(`\\b${escapeRegex(kw.text)}\\b`, "gi");
        let match;

        while ((match = regex.exec(text)) !== null) {
            const startPos = model.getPositionAt(match.index);
            const endPos = model.getPositionAt(match.index + kw.text.length);

            // Skip if this keyword is on a heading line (the title itself)
            if (headingLines.has(startPos.lineNumber)) {
                continue;
            }

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

    // Wiki-style links [[path]]
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    let wikiMatch;
    
    while ((wikiMatch = wikiLinkRegex.exec(text)) !== null) {
        const startPos = model.getPositionAt(wikiMatch.index);
        const endPos = model.getPositionAt(wikiMatch.index + wikiMatch[0].length);

        decorations.push({
            range: new monaco.Range(
                startPos.lineNumber,
                startPos.column,
                endPos.lineNumber,
                endPos.column
            ),
            options: {
                inlineClassName: 'wiki-link',
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
export function setupAutocomplete(editor: monaco.editor.IStandaloneCodeEditor, keywords: Array<{ text: string; type: string }>, noteId?: number) {
    const disposable = monacoLanguages.registerCompletionItemProvider("markdown", {
        // Trigger characters để autocomplete dễ xuất hiện hơn
        triggerCharacters: ['#', '@', ' ', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        
        provideCompletionItems: (model: any, position: any) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);
            
            // Check if current line is a heading - if so, don't autocomplete headings
            const isOnHeadingLine = /^#{1,6}\s+/.test(lineContent);
            
            console.log('[Autocomplete] Current line:', lineContent);
            console.log('[Autocomplete] Is on heading line:', isOnHeadingLine);
            
            // Dynamically extract headings from current text (excluding current line if it's a heading)
            const currentText = model.getValue();
            const headings = isOnHeadingLine 
                ? [] // Don't extract headings when typing on a heading line
                : extractHeadingsAsKeywords(currentText, noteId);
            
            console.log('[Autocomplete] Static keywords:', keywords.length);
            console.log('[Autocomplete] Extracted headings:', headings.length, headings);
            
            // Merge with static keywords
            const allKeywords = [...keywords, ...headings];
            
            console.log('[Autocomplete] Total keywords:', allKeywords.length);
            
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
                keyword: { text: string; type: string };
                startColumn: number;
                matchedText: string;
                score: number;
            }
            const allMatches: MatchResult[] = [];

            allKeywords.forEach((kw) => {
                if (!textTrimmed) {
                    // Nếu chưa gõ gì, show all keywords
                    allMatches.push({
                        keyword: kw,
                        startColumn: position.column,
                        matchedText: '',
                        score: 0
                    });
                    return;
                }

                // Thử fuzzy match với các word combinations từ cuối text
                for (let wordCount = wordsInText.length; wordCount > 0; wordCount--) {
                    const searchWords = wordsInText.slice(-wordCount);
                    const phrase = searchWords.join(' ');

                    // Fuzzy match
                    const { match, score } = fuzzyMatch(kw.text, searchWords);

                    if (match) {
                        // Tìm vị trí bắt đầu của phrase trong text
                        const phraseStartInText = textBeforeCursor.lastIndexOf(phrase);

                        if (phraseStartInText !== -1) {
                            // Check word boundary
                            const charBefore = phraseStartInText > 0 ? textBeforeCursor[phraseStartInText - 1] : ' ';

                            if (charBefore === ' ' || phraseStartInText === 0 || /\s/.test(charBefore)) {
                                // Add to matches
                                allMatches.push({
                                    keyword: kw,
                                    startColumn: phraseStartInText + 1,
                                    matchedText: phrase,
                                    score: score
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

            console.log('[Autocomplete] Matches:', allMatches.length, 'suggestions');

            // Determine start column - use first match or cursor position
            const startColumn = allMatches.length > 0 && allMatches[0].matchedText 
                ? allMatches[0].startColumn 
                : position.column;
            
            const suggestions = allMatches
                .map((matchResult) => {
                    const kw = matchResult.keyword;
                    // Icon dựa trên type
                    let kind = monacoLanguages.CompletionItemKind.Keyword;
                    if (kw.type === 'hashtag') kind = monacoLanguages.CompletionItemKind.Color;
                    if (kw.type === 'status') kind = monacoLanguages.CompletionItemKind.Enum;
                    if (kw.type === 'class') kind = monacoLanguages.CompletionItemKind.Class;
                    if (kw.type === 'type') kind = monacoLanguages.CompletionItemKind.Interface;
                    if (kw.type.startsWith('heading-')) kind = monacoLanguages.CompletionItemKind.Reference; // Heading icon
                    
                    // Range phải thay thế từ đầu partial match đến cursor
                    const range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: startColumn,
                        endColumn: position.column,
                    };
                    
                    return {
                        label: kw.text,
                        kind: kind,
                        insertText: kw.text,
                        range,
                        documentation: `Type: ${kw.type}`,
                        detail: `${kw.type} keyword`,
                        sortText: `${1000 - matchResult.score}${kw.text}`, // Sort by score (higher first)
                    };
                });

            console.log('[Autocomplete] Final suggestions:', suggestions.map(s => s.label));

            return { suggestions };
        },
    });

    return () => disposable.dispose();
}

/**
 * Setup definition provider with dynamic heading extraction and cross-note navigation
 */
export function setupDefinitionProvider(
    editor: monaco.editor.IStandaloneCodeEditor, 
    keywords: Array<{ text: string; type: string }>,
    noteId?: number,
    onNavigateToNote?: (targetNoteId: number, headingPath: string) => void
) {
    const disposable = monacoLanguages.registerDefinitionProvider("markdown", {
        provideDefinition: (model, position) => {
            // Dynamically extract headings from current text
            const currentText = model.getValue();
            const headings = extractHeadingsAsKeywords(currentText, noteId);
            
            // Merge with static keywords
            const allKeywords = [...keywords, ...headings];
            
// Get line content to check for keywords or wiki-style links
            const lineContent = model.getLineContent(position.lineNumber);
            const clickColumn = position.column;
            
            // Strategy 0: Check if clicking on [[path]] wiki-style link
            // Pattern: [[path/to/heading]] or [[heading]]
            const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
            let wikiMatch;
            
            while ((wikiMatch = wikiLinkRegex.exec(lineContent)) !== null) {
                const startIndex = wikiMatch.index;
                const endIndex = startIndex + wikiMatch[0].length;
                const path = wikiMatch[1];
                
                // Check if cursor is within this link (1-based columns)
                if (clickColumn >= startIndex + 1 && clickColumn <= endIndex + 1) {
                    console.log('[DefinitionProvider] Clicked on wiki link:', path);
                    
                    // Parse path to extract noteId
                    // Formats:
                    // - 123/Introduction/Getting Started
                    // - Introduction (same note)
                    
                    let targetNoteId: number | null = null;
                    let headingName: string;
                    
                    if (/^\d+\//.test(path)) {
                        // Full format: 123/Introduction/Getting Started
                        const pathMatch = path.match(/^(\d+)\/(.+)$/);
                        if (pathMatch) {
                            targetNoteId = parseInt(pathMatch[1], 10);
                            const remainingPath = pathMatch[2];
                            const segments = remainingPath.split('/');
                            headingName = segments[segments.length - 1];
                        } else {
                            return null;
                        }
                    } else {
                        // Just heading name: Introduction (same note)
                        const segments = path.split('/');
                        headingName = segments[segments.length - 1];
                    }
                    
                    // If cross-note reference (different noteId), trigger navigation
                    if (targetNoteId && noteId && targetNoteId !== noteId && onNavigateToNote) {
                        console.log('[DefinitionProvider] Cross-note wiki link detected');
                        onNavigateToNote(targetNoteId, path);
                        return null;
                    }
                    
                    // Same note or no noteId in path - find heading and jump
                    // Continue with regular heading search using headingName
                    // We'll search for this heading below
                }
            }
            
            // Try to find multi-word keyword at cursor position
            let keyword = null;
            let matchRange = null;
            
            // Check each keyword to see if cursor is within it
            for (const kw of allKeywords) {
                const kwLower = kw.text.toLowerCase();
                const lineLower = lineContent.toLowerCase();
                
                // Find all occurrences in the line
                let startIndex = 0;
                while ((startIndex = lineLower.indexOf(kwLower, startIndex)) !== -1) {
                    const endIndex = startIndex + kw.text.length;
                    
                    // Check if cursor is within this keyword (1-based columns)
                    if (clickColumn >= startIndex + 1 && clickColumn <= endIndex + 1) {
                        keyword = kw;
                        matchRange = {
                            startColumn: startIndex + 1,
                            endColumn: endIndex + 1
                        };
                        break;
                    }
                    startIndex = endIndex;
                }
                
                if (keyword) break;
            }
            
            if (!keyword) return null;

            // Check if this is a cross-note reference (path with different noteId)
            // Type assertion: keyword from headings will have 'path' property
            const keywordWithPath = keyword as { text: string; type: string; path?: string };
            
            if (keywordWithPath.path) {
                const pathMatch = keywordWithPath.path.match(/^super-app\/(\d+)\//);
                if (pathMatch) {
                    const targetNoteId = parseInt(pathMatch[1], 10);
                    
                    // If target noteId is different from current noteId, it's a cross-note reference
                    if (noteId && targetNoteId !== noteId && onNavigateToNote) {
                        console.log('[DefinitionProvider] Cross-note reference detected:', {
                            currentNoteId: noteId,
                            targetNoteId,
                            path: keywordWithPath.path,
                            keyword: keyword.text
                        });
                        
                        // Trigger navigation callback
                        onNavigateToNote(targetNoteId, keywordWithPath.path || '');
                        
                        // Return null to prevent default navigation
                        return null;
                    }
                }
            }

            const text = model.getValue();
            const lines = text.split('\n');
            
            // Strategy 1: Look for EXACT heading match (# Title)
            // This is highest priority for title-based navigation
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim(); // Trim to handle CRLF
                const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
                
                if (headingMatch) {
                    const title = headingMatch[2].trim();
                    // Remove markdown formatting
                    const cleanTitle = title
                        .replace(/\*\*(.+?)\*\*/g, '$1')
                        .replace(/\*(.+?)\*/g, '$1')
                        .replace(/__(.+?)__/g, '$1')
                        .replace(/_(.+?)_/g, '$1')
                        .replace(/`(.+?)`/g, '$1')
                        .replace(/~~(.+?)~~/g, '$1')
                        .trim();
                    
                    // Check for exact match (case-insensitive)
                    if (cleanTitle.toLowerCase() === keyword.text.toLowerCase()) {
                        const lineNumber = i + 1;
                        const originalLine = lines[i]; // Get original line for column calculation
                        const startColumn = originalLine.indexOf('#') + 1;
                        const endColumn = originalLine.trimEnd().length + 1;
                        
                        return {
                            uri: model.uri,
                            range: new monaco.Range(
                                lineNumber,
                                startColumn,
                                lineNumber,
                                endColumn
                            )
                        };
                    }
                }
            }
            
            // Strategy 2: Look for explicit definition comment
            // Format: <!-- Define: keyword --> or <!--Define:keyword-->
            const defineCommentRegex = new RegExp(
                `<!--\\s*Define\\s*:\\s*${escapeRegex(keyword.text)}\\s*-->`,
                "i"
            );
            const defineMatch = defineCommentRegex.exec(text);
            
            if (defineMatch) {
                const startPos = model.getPositionAt(defineMatch.index);
                const endPos = model.getPositionAt(defineMatch.index + defineMatch[0].length);
                
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

            // Strategy 3: Look for heading that CONTAINS the keyword (partial match)
            // Format: # My keyword explanation
            const headingRegex = new RegExp(
                `^#{1,6}\\s+.*\\b${escapeRegex(keyword.text)}\\b.*$`,
                "im"
            );
            const headingMatch = headingRegex.exec(text);
            
            if (headingMatch) {
                const startPos = model.getPositionAt(headingMatch.index);
                const endPos = model.getPositionAt(headingMatch.index + headingMatch[0].length);
                
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

            // Strategy 4: Find first occurrence (fallback)
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

/**
 * Setup folding provider for markdown headings
 */
export function setupMarkdownFolding(editor: monaco.editor.IStandaloneCodeEditor) {
    const disposable = monacoLanguages.registerFoldingRangeProvider("markdown", {
        provideFoldingRanges: (model) => {
            const lines = model.getLinesContent();
            const foldingRanges: monaco.languages.FoldingRange[] = [];
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
                            kind: monacoLanguages.FoldingRangeKind.Region
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
                    kind: monacoLanguages.FoldingRangeKind.Region
                });
            }

            return foldingRanges;
        }
    });

    return () => disposable.dispose();
}

export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Convert original version (with links) to display version (clean text)
 * Original: [[super-app/123/Introduction]] or [[Introduction]]
 * Display: Introduction
 * 
 * @param text - Original markdown with wiki-style links
 * @returns Clean display text
 */
export function convertToDisplayVersion(text: string): string {
    // Match pattern: [[path/to/heading]] or [[heading]]
    // Extract just the last part (heading name)
    return text.replace(/\[\[([^\]]+)\]\]/g, (match, path) => {
        // Extract last segment of path as display text
        // super-app/123/Introduction/Getting Started → Getting Started
        // Introduction → Introduction
        const segments = path.split('/');
        return segments[segments.length - 1];
    });
}

/**
 * Convert display version to original version (with wiki-style links)
 * This requires current note context and heading extraction
 * 
 * @param text - Display text
 * @param noteId - Current note ID
 * @returns Original markdown with generated [[path]] links
 */
export function convertToOriginalVersion(text: string, noteId?: number): string {
    if (!noteId) return text;
    
    // Extract all headings from current text to build link map
    const headings = extractHeadingsAsKeywords(text, noteId);
    
    // Build a map of keyword -> path for replacement
    const keywordPathMap = new Map<string, string>();
    headings.forEach(h => {
        if (h.path) {
            keywordPathMap.set(h.text.toLowerCase(), h.path);
        }
    });
    
    let result = text;
    const lines = text.split('\n');
    const resultLines: string[] = [];
    
    lines.forEach((line) => {
        const trimmedLine = line.trim();
        
        // Skip heading lines themselves
        if (/^#{1,6}\s+/.test(trimmedLine)) {
            resultLines.push(line);
            return;
        }
        
        let processedLine = line;
        
        // For each keyword, check if it appears in this line
        keywordPathMap.forEach((path, keywordLower) => {
            // Find the original keyword with proper casing
            const originalKeyword = Array.from(keywordPathMap.entries())
                .find(([k]) => k === keywordLower)?.[0];
            
            if (!originalKeyword) return;
            
            // Get actual keyword text from headings
            const heading = headings.find(h => h.text.toLowerCase() === keywordLower);
            if (!heading) return;
            
            // Create regex to match whole keyword (case-insensitive, word boundary)
            const regex = new RegExp(`\\b(${escapeRegex(heading.text)})\\b`, 'gi');
            
            // Replace all occurrences with [[path]]
            processedLine = processedLine.replace(regex, `[[${path}]]`);
        });
        
        resultLines.push(processedLine);
    });
    
    return resultLines.join('\n');
}

/**
 * Extract all headings from markdown text as keywords with hierarchical paths
 * @param text - Markdown text
 * @param noteId - Current note ID for generating full paths
 */
export function extractHeadingsAsKeywords(text: string, noteId?: number): Array<{ text: string; type: string; line: number; path?: string }> {
    const lines = text.split('\n');
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
                .replace(/\*\*(.+?)\*\*/g, '$1')  // Bold
                .replace(/\*(.+?)\*/g, '$1')      // Italic
                .replace(/__(.+?)__/g, '$1')      // Bold alt
                .replace(/_(.+?)_/g, '$1')        // Italic alt
                .replace(/`(.+?)`/g, '$1')        // Code
                .replace(/~~(.+?)~~/g, '$1')      // Strikethrough
                .trim();
            
            if (cleanTitle) {
                // Pop headings from stack until we find parent (lower level number)
                while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
                    headingStack.pop();
                }
                
                // Build hierarchical path
                const pathParts = headingStack.map(h => h.title);
                pathParts.push(cleanTitle);
                
                // Generate path: noteId/title1/title2/title3
                const fullPath = noteId 
                    ? `${noteId}/${pathParts.join('/')}`
                    : pathParts.join('/');
                
                headings.push({
                    text: cleanTitle,
                    type: `heading-${level}`,
                    line: index + 1,  // Monaco uses 1-based line numbers
                    path: fullPath
                });
                
                // Add current heading to stack
                headingStack.push({ level, title: cleanTitle });
            }
        }
    });
    
    console.log('[ExtractHeadings] Extracted', headings.length, 'headings:', headings.map(h => ({ title: h.text, path: h.path })));
    return headings;
}

/**
 * Setup hover provider with dynamic heading extraction
 */
export function setupHoverProvider(editor: monaco.editor.IStandaloneCodeEditor, keywords: Array<{ text: string; type: string }>, noteId?: number) {
    const disposable = monacoLanguages.registerHoverProvider("markdown", {
        provideHover: (model, position) => {
            // Dynamically extract headings from current text
            const currentText = model.getValue();
            const headings = extractHeadingsAsKeywords(currentText, noteId);
            
            // Merge with static keywords
            const allKeywords = [...keywords, ...headings];
            
            // Get line content to check for multi-word keywords
            const lineContent = model.getLineContent(position.lineNumber);
            const hoverColumn = position.column;
            
            // Try to find multi-word keyword at cursor position
            let keyword = null;
            let matchRange = null;
            
            // Check each keyword to see if cursor is within it
            for (const kw of allKeywords) {
                const kwLower = kw.text.toLowerCase();
                const lineLower = lineContent.toLowerCase();
                
                // Find all occurrences in the line
                let startIndex = 0;
                while ((startIndex = lineLower.indexOf(kwLower, startIndex)) !== -1) {
                    const endIndex = startIndex + kw.text.length;
                    
                    // Check if cursor is within this keyword (1-based columns)
                    if (hoverColumn >= startIndex + 1 && hoverColumn <= endIndex + 1) {
                        keyword = kw;
                        matchRange = {
                            startColumn: startIndex + 1,
                            endColumn: endIndex + 1,
                            lineNumber: position.lineNumber
                        };
                        break;
                    }
                    startIndex = endIndex;
                }
                
                if (keyword) break;
            }
            
            if (!keyword || !matchRange) return null;

            return {
                range: new monaco.Range(
                    matchRange.lineNumber,
                    matchRange.startColumn,
                    matchRange.lineNumber,
                    matchRange.endColumn
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