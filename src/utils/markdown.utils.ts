
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
export function setupAutocomplete(editor: monaco.editor.IStandaloneCodeEditor, keywords: Array<{ text: string; type: string }>) {
    const disposable = monacoLanguages.registerCompletionItemProvider("markdown", {
        // Trigger characters để autocomplete dễ xuất hiện hơn
        triggerCharacters: ['#', '@', ' ', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
        
        provideCompletionItems: (model: any, position: any) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);
            
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

            keywords.forEach((kw) => {
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

            return { suggestions };
        },
    });

    return () => disposable.dispose();
}

/**
 * Setup definition provider
 */
export function setupDefinitionProvider(editor: monaco.editor.IStandaloneCodeEditor, keywords: Array<{ text: string; type: string }>) {
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
 * Setup hover provider
 */
export function setupHoverProvider(editor: monaco.editor.IStandaloneCodeEditor, keywords: Array<{ text: string; type: string }>) {
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