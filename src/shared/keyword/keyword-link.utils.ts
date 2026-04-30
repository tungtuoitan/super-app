/**
 * Keyword Link Utilities
 * Parse and navigate keyword links in markdown editor
 */

import type { Keyword } from "./keyword.types";

export interface ParsedKeywordLink {
    type: "workspace" | "folder" | "note" | "external" | "project" | "task" | "log" | "track";
    // workspace / folder / note
    workspaceId?: number;
    folderId?: number;          // workspace_items.id of the folder
    noteWorkspaceItemId?: number; // workspace_items.id of the note
    // project / task
    projectId?: number;
    taskId?: number;
    // log / track
    logId?: number;
    trackId?: number;
    // external
    url?: string;
    raw: string;
}

/**
 * Parse keyword link to extract navigation target.
 *
 * Link formats (sa/ prefix is stripped before parsing):
 *   sa/w77              → workspace
 *   sa/w77/f183         → folder
 *   sa/w77/f183/n25     → note
 *   sa/p11              → project
 *   sa/p11/t22          → task
 *   sa/l01              → log
 *   sa/tr01             → track
 *   https://...         → external
 */
export function parseKeywordLink(keyword: Keyword): ParsedKeywordLink | null {
    const link = keyword.link;
    if (!link) return null;

    // External: URL or type=external
    if (keyword.type === "external" || link.startsWith("http://") || link.startsWith("https://")) {
        return { type: "external", url: link, raw: link };
    }

    // Strip sa/ prefix
    const cleanLink = link.startsWith("sa/") ? link.substring(3) : link;
    const parts = cleanLink.split("/").filter(p => p.length > 0);

    if (!parts[0]) return null;

    // workspace/folder/note: starts with w{number}
    if (/^w\d+$/.test(parts[0])) {
        const workspaceId = parseInt(parts[0].substring(1), 10);
        if (isNaN(workspaceId)) return null;

        if (parts.length === 1) {
            return { type: "workspace", workspaceId, raw: link };
        }

        const result: ParsedKeywordLink = { type: "workspace", workspaceId, raw: link };

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];

            if (/^f\d+$/.test(part)) {
                result.type = "folder";
                result.folderId = parseInt(part.substring(1), 10);
            } else if (/^n\d+$/.test(part)) {
                result.type = "note";
                result.noteWorkspaceItemId = parseInt(part.substring(1), 10);
                break;
            } else {
                break;
            }
        }

        return result;
    }

    // track: tr{number} — must check before log (l{number}) to avoid prefix clash
    if (/^tr\d+$/.test(parts[0])) {
        const trackId = parseInt(parts[0].substring(2), 10);
        return isNaN(trackId) ? null : { type: "track", trackId, raw: link };
    }

    // project / task: p{number} or p{number}/t{number}
    if (/^p\d+$/.test(parts[0])) {
        const projectId = parseInt(parts[0].substring(1), 10);
        if (isNaN(projectId)) return null;

        if (parts.length >= 2 && /^t\d+$/.test(parts[1])) {
            const taskId = parseInt(parts[1].substring(1), 10);
            return isNaN(taskId) ? null : { type: "task", projectId, taskId, raw: link };
        }

        return { type: "project", projectId, raw: link };
    }

    // log: l{number}
    if (/^l\d+$/.test(parts[0])) {
        const logId = parseInt(parts[0].substring(1), 10);
        return isNaN(logId) ? null : { type: "log", logId, raw: link };
    }

    return null;
}

/**
 * Find keyword by exact link match.
 */
export function findKeywordByLink(link: string, allKeywords: Keyword[]): Keyword | null {
    return allKeywords.find(k => k.link === link) ?? null;
}

/**
 * Get heading anchor from heading path.
 * Example: ["Introduction", "Overview"] → "overview"
 */
export function getHeadingAnchor(headingPath: string[]): string {
    if (!headingPath || headingPath.length === 0) return "";
    const lastTitle = headingPath[headingPath.length - 1];
    return lastTitle.toLowerCase().replace(/\s+/g, "-");
}
