import type * as _monaco from "monaco-editor";
import type { Monaco } from "@monaco-editor/react";
import { escapeRegex } from "./markdown.conversion";

type KeywordWithDetails = {
    text: string;
    type: string;
    link?: string;
    longLink?: string;
    name?: string;
    nameIndex?: number;
    hardDeletedAt?: Date | null;
    [key: string]: unknown;
};

interface MatchResult {
    keyword: { text: string; type: string; link?: string };
    startColumn: number;
    matchedText: string;
    score: number;
}

// ─── Private helpers ───────────────────────────────────────────────────────────

function fuzzyMatch(keyword: string, searchWords: string[]): { match: boolean; score: number } {
    const kwLower = keyword.toLowerCase();
    let matchedCount = 0;
    let totalPosition = 0;

    for (const word of searchWords) {
        const wordLower = word.toLowerCase();
        const foundIndex = kwLower.indexOf(wordLower);
        if (foundIndex !== -1) {
            matchedCount++;
            totalPosition += foundIndex;
        } else {
            return { match: false, score: 0 };
        }
    }

    const score = matchedCount * 1000 - totalPosition;
    return { match: true, score };
}

function isKeywordHardDeleted(kw: KeywordWithDetails): boolean {
    return kw.hardDeletedAt !== null && kw.hardDeletedAt !== undefined;
}

function getKeywordMatchTarget(kw: KeywordWithDetails): string {
    return kw.name || kw.text;
}

function getCompletionItemKind($mi: Monaco, keywordType: string): number {
    switch (keywordType) {
        case "workspace":
            return $mi.languages.CompletionItemKind.Constructor;
        case "folder":
            return $mi.languages.CompletionItemKind.Folder;
        case "note":
        case "file":
            return $mi.languages.CompletionItemKind.File;
        case "external":
            return $mi.languages.CompletionItemKind.Reference;
        default:
            return $mi.languages.CompletionItemKind.Value;
    }
}

function determineInsertText(kw: KeywordWithDetails, isInHeading: boolean): string {
    if (!kw.name) return kw.text;
    if (isInHeading) return kw.name;
    return `[${kw.name}]`;
}

function buildCompletionItemDetails(kw: KeywordWithDetails) {
    const fullPath = kw.longLink || kw.link || "";
    let displayPath = "";
    if (fullPath) {
        const parts = fullPath.split("/");
        if (parts.length > 1) {
            parts.pop();
            displayPath = parts.join("/");
        }
    }

    return {
        documentation: displayPath ? `Type: ${kw.type}\nPath: ${displayPath}` : `Type: ${kw.type}`,
        detail: displayPath || undefined,
        displayLabel: kw.name || kw.text,
    };
}

function findMatchingKeywords(
    keywords: KeywordWithDetails[],
    textBeforeCursor: string,
    cursorColumn: number,
): MatchResult[] {
    const textTrimmed = textBeforeCursor.trim();
    const wordsInText = textTrimmed ? textTrimmed.split(/\s+/) : [];
    const allMatches: MatchResult[] = [];

    keywords.forEach((kw) => {
        if (isKeywordHardDeleted(kw)) return;

        if (!textTrimmed) {
            allMatches.push({ keyword: kw, startColumn: cursorColumn, matchedText: "", score: 0 });
            return;
        }

        for (let wordCount = wordsInText.length; wordCount > 0; wordCount--) {
            const searchWords = wordsInText.slice(-wordCount);
            const phrase = searchWords.join(" ");
            const matchTarget = getKeywordMatchTarget(kw);
            const { match, score } = fuzzyMatch(matchTarget, searchWords);

            if (match) {
                const phraseStartInText = textBeforeCursor.lastIndexOf(phrase);
                if (phraseStartInText !== -1) {
                    const charBefore = phraseStartInText > 0 ? textBeforeCursor[phraseStartInText - 1] : " ";
                    if (charBefore === " " || phraseStartInText === 0 || /\s/.test(charBefore)) {
                        allMatches.push({
                            keyword: kw,
                            startColumn: phraseStartInText + 1,
                            matchedText: phrase,
                            score,
                        });
                        break;
                    }
                }
            }
        }
    });

    return allMatches;
}

function handleOpeningBracket(insertText: string, hasOpeningBracket: boolean, isInHeading: boolean): string {
    if (hasOpeningBracket && !isInHeading) {
        return insertText.substring(1);
    }
    return insertText;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Register an autocomplete provider for the Monaco markdown language.
 * Returns a cleanup function that disposes the provider.
 */
export function setupAutocomplete(
    $mi: Monaco | null,
    editor: _monaco.editor.IStandaloneCodeEditor,
    _allKeywords: Array<{ text: string; type: string; link?: string; longLink?: string; name?: string; nameIndex?: number }>,
    noteId?: number,
) {
    if (!$mi) return () => {};

    const disposable = $mi.languages.registerCompletionItemProvider("markdown", {
        triggerCharacters: [
            "#", "@", "[", " ",
            "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
            "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
        ],

        provideCompletionItems: (model, position) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);

            const externalLinkPattern = /\[\[([^|\]]*)\|([^\]]*)$/;
            if (externalLinkPattern.test(textBeforeCursor)) {
                return { suggestions: [] };
            }

            const isInHeading = /^#{1,6}\s+/.test(lineContent.trim());
            const allMatches = findMatchingKeywords(_allKeywords as KeywordWithDetails[], textBeforeCursor, position.column);
            allMatches.sort((a, b) => b.score - a.score);

            const startColumn =
                allMatches.length > 0 && allMatches[0].matchedText ? allMatches[0].startColumn : position.column;

            const hasOpeningBracket =
                textBeforeCursor.trimEnd().endsWith("[") ||
                (startColumn > 1 && lineContent[startColumn - 2] === "[");

            const suggestions = allMatches.map((matchResult) => {
                const kw = matchResult.keyword as KeywordWithDetails;
                const kind = getCompletionItemKind($mi, kw.type);
                let insertText = determineInsertText(kw, isInHeading);
                insertText = handleOpeningBracket(insertText, hasOpeningBracket, isInHeading);

                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn,
                    endColumn: position.column,
                };
                const { documentation, detail, displayLabel } = buildCompletionItemDetails(kw);

                return {
                    label: displayLabel,
                    kind,
                    insertText,
                    range,
                    documentation,
                    detail,
                    sortText: `${1000 - matchResult.score}${displayLabel}`,
                };
            });

            return { suggestions };
        },
    });

    return () => disposable.dispose();
}
