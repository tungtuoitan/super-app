/**
 * Keyword Link Utilities
 * Parse and navigate keyword links in markdown editor
 */

import type { Keyword } from "@/types/keyword.types";

/**
 * Parsed keyword link information
 */
export interface ParsedKeywordLink {
    type: "workspace" | "folder" | "note" | "heading" | "external";
    workspaceId?: number;
    folderId?: number;
    noteWorkspaceItemId?: number;
    headingPath?: string[]; // For headings: ["Introduction", "Overview", "Details"]
    url?: string; // For external links
    raw: string; // Original link
}

/**
 * Parse keyword link to extract information
 *
 * Format examples:
 * - w77 (workspace)
 * - w77/f183 (folder)
 * - w77/f183/f184 (nested folder)
 * - w77/n185 (note)
 * - w77/n186/ (note with trailing slash)
 * - w77/n186/Nhà sản xuất (note with heading)
 * - w77/n187/Wonbin2/ai nữa2 (note with nested headings)
 * - https://google.com (external)
 */
export function parseKeywordLink(keyword: Keyword): ParsedKeywordLink | null {
    const link = keyword.link;
    if (!link) return null;

    // Check if external link (starts with http:// or https://)
    if (keyword.type === "external" || link.startsWith("http://") || link.startsWith("https://")) {
        return {
            type: "external",
            url: link,
            raw: link,
        };
    }

    const parts = link.split("/").filter(p => p.length > 0); // Remove empty parts

    // Must start with "w{number}"
    if (!parts[0] || !parts[0].match(/^w\d+$/)) {
        return null;
    }

    const result: ParsedKeywordLink = {
        type: "workspace",
        raw: link,
    };

    // Parse workspace ID from "w123"
    result.workspaceId = parseInt(parts[0].substring(1), 10);
    if (isNaN(result.workspaceId)) return null;

    // If only workspace, return
    if (parts.length === 1) {
        return result;
    }

    // Parse remaining parts
    let i = 1;
    while (i < parts.length) {
        const part = parts[i];

        // Check if it's a folder (f{number})
        if (part.match(/^f\d+$/)) {
            result.type = "folder";
            result.folderId = parseInt(part.substring(1), 10);
            i += 1;
        }
        // Check if it's a note (n{number})
        else if (part.match(/^n\d+$/)) {
            result.type = "note";
            result.noteWorkspaceItemId = parseInt(part.substring(1), 10);
            i += 1;

            // After note, remaining parts are headings
            if (i < parts.length) {
                result.type = "heading";
                result.headingPath = parts.slice(i);
                break;
            }
        } else {
            // Unknown format, stop parsing
            break;
        }
    }

    return result;
}

/**
 * Find keyword by link in allKeywords array
 */
export function findKeywordByLink(link: string, allKeywords: Keyword[]): Keyword | null {
    return allKeywords.find(k => k.link === link) || null;
}

/**
 * Get heading anchor from heading path
 * Example: ["Introduction", "Overview"] -> "overview"
 * Example: ["Nhà sản xuất"] -> "nhà-sản-xuất"
 */
export function getHeadingAnchor(headingPath: string[]): string {
    if (!headingPath || headingPath.length === 0) return "";

    // Get last heading title (last item in path)
    const lastTitle = headingPath[headingPath.length - 1];

    // Convert to anchor: lowercase, replace spaces with hyphens
    return lastTitle.toLowerCase().replace(/\s+/g, "-");
}
