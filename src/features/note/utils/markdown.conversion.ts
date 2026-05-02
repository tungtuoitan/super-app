import type * as _monaco from "monaco-editor";
import {Keyword} from "@/shared";

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract external links from markdown text
 * Format: [[name|url]] where url starts with http:// or https://
 */
export function extractExternalLinks(text: string): Array<{ name: string; url: string }> {
    const externalLinks: Array<{ name: string; url: string }> = [];
    const linkRegex = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
        const name = match[1].trim();
        const link = match[2].trim();

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
 */
export function convertToDisplayVersion(text: string, allKeywords: Array<{ id: number; name: string; nameIndex?: number }>): string | null {
    if (!allKeywords || allKeywords.length === 0) {
        return null; // Wait for keywords before converting — null means "still loading"
    }

    const keywordMap = new Map<number, string>();
    allKeywords.forEach((kw) => {
        const displayText = `[${kw.name}]`;
        keywordMap.set(kw.id, displayText);
    });

    const result = text.replace(/\[\[(\d+)\]\]/g, (match, idStr) => {
        const id = parseInt(idStr, 10);
        const displayText = keywordMap.get(id);
        return displayText || match;
    });

    if (result.includes("[[") || result.includes("]]")) {
        return null;
    }

    return result;
}

/**
 * Convert display version (with [name]) to original version (with keyword IDs)
 * Display: [Introduction]
 * Original: [[123]] (keyword ID with double brackets)
 */
export function convertToOriginalVersion(text: string, allKeywords: Array<{ id: number; name: string; nameIndex?: number }>): string | null {
    if (!allKeywords || allKeywords.length === 0) return null;

    const keywordIdMap = new Map<string, number>();
    allKeywords.forEach((kw) => {
        const key = `[${kw.name}]`.toLowerCase();
        keywordIdMap.set(key, kw.id);
    });

    const result = text.replace(/\[([^\]]+)\]/g, (match, name) => {
        const key = `[${name}]`.toLowerCase();
        const id = keywordIdMap.get(key);
        return id !== undefined ? `[[${id}]]` : match;
    });

    return result;
}

/**
 * Extract all headings from markdown text as keywords with hierarchical paths
 */
export function extractHeadingsAsKeywords(text: string, noteId?: number): Array<{ text: string; type: string; line: number; path?: string }> {
    const lines = text.split("\n");
    const headings: Array<{ text: string; type: string; line: number; path?: string }> = [];
    const headingStack: Array<{ level: number; title: string }> = [];

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);

        if (headingMatch) {
            const level = headingMatch[1].length;
            const title = headingMatch[2].trim();

            const cleanTitle = title
                .replace(/\*\*(.+?)\*\*/g, "$1")
                .replace(/\*(.+?)\*/g, "$1")
                .replace(/__(.+?)__/g, "$1")
                .replace(/_(.+?)_/g, "$1")
                .replace(/`(.+?)`/g, "$1")
                .replace(/~~(.+?)~~/g, "$1")
                .trim();

            if (cleanTitle) {
                while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
                    headingStack.pop();
                }

                const pathParts = headingStack.map((h) => h.title);
                pathParts.push(cleanTitle);
                const fullPath = noteId ? `${noteId}/${pathParts.join("/")}` : pathParts.join("/");

                headings.push({
                    text: cleanTitle,
                    type: `heading-${level}`,
                    line: index + 1,
                    path: fullPath,
                });

                headingStack.push({ level, title: cleanTitle });
            }
        }
    });

    return headings;
}
