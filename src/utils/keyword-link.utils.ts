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
    headingPath?: string[]; // For headings: ["h1", "Introduction", "h2", "Overview"]
    url?: string; // For external links
    raw: string; // Original link
}

/**
 * Parse keyword link to extract information
 *
 * Format examples:
 * - workspace/123
 * - workspace/123/folder/456
 * - workspace/123/folder/456/note/789
 * - workspace/123/note/789/h1/Introduction/h2/Overview
 * - https://google.com (external)
 */
export function parseKeywordLink(link: string): ParsedKeywordLink | null {
    if (!link) return null;

    // Check if external link (starts with http:// or https://)
    if (link.startsWith("http://") || link.startsWith("https://")) {
        return {
            type: "external",
            url: link,
            raw: link,
        };
    }

    const parts = link.split("/");

    // Must start with "workspace"
    if (parts[0] !== "workspace") {
        return null;
    }

    const result: ParsedKeywordLink = {
        type: "workspace",
        raw: link,
    };

    // Parse workspace ID
    if (parts.length >= 2) {
        result.workspaceId = parseInt(parts[1], 10);
        if (isNaN(result.workspaceId)) return null;
    }

    // Parse remaining parts
    let i = 2;
    while (i < parts.length) {
        const prefix = parts[i];
        const value = parts[i + 1];

        if (prefix === "folder" && value) {
            result.type = "folder";
            result.folderId = parseInt(value, 10);
            i += 2;
        } else if (prefix === "note" && value) {
            result.type = "note";
            result.noteWorkspaceItemId = parseInt(value, 10);
            i += 2;
        } else if (prefix.match(/^h[1-6]$/) && value) {
            // Heading detected
            result.type = "heading";
            result.headingPath = [];

            // Parse all heading levels
            while (i < parts.length && parts[i].match(/^h[1-6]$/)) {
                result.headingPath.push(parts[i]); // h1, h2, etc
                result.headingPath.push(parts[i + 1]); // title
                i += 2;
            }
            break;
        } else {
            // Unknown prefix, stop parsing
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
 * Example: ["h1", "Introduction", "h2", "Overview"] -> "overview"
 */
export function getHeadingAnchor(headingPath: string[]): string {
    if (!headingPath || headingPath.length === 0) return "";

    // Get last heading title (last item in path)
    const lastTitle = headingPath[headingPath.length - 1];

    // Convert to anchor: lowercase, replace spaces with hyphens
    return lastTitle.toLowerCase().replace(/\s+/g, "-");
}
