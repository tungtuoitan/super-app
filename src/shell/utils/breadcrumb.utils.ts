/**
 * Breadcrumb utilities for EditorToolbar
 */

import type { Keyword } from "@/shared";

export interface BreadcrumbItem {
    type: "workspace" | "folder" | "note";
    name: string;
    link: string; // Full sa/ link for navigation
    color?: string;
    icon?: string;
    isNew?: boolean;
    /** When true, the breadcrumb item is not clickable (e.g. already the active workspace) */
    disabled?: boolean;
}

// Workspace item entity type codes — defined by the backend schema
const ENTITY_TYPE_FOLDER = 2;
const ENTITY_TYPE_NOTE = 3;

/**
 * Parse keyword longLink + link into breadcrumb items.
 *
 * Example:
 *   link:     "sa/w77/f183/n185"
 *   longLink: "Workspace A[77]/Folder B[183]/Note C[185]"
 *
 * Returns:
 *   [
 *     { type: 'workspace', name: 'Workspace A', link: 'sa/w77' },
 *     { type: 'folder',    name: 'Folder B',    link: 'sa/w77/f183' },
 *     { type: 'note',      name: 'Note C',      link: 'sa/w77/f183/n185' },
 *   ]
 */
export function parseBreadcrumbFromKeyword(keyword: Keyword): BreadcrumbItem[] {
    const { longLink, link } = keyword;
    if (!longLink || !link) return [];

    const longLinkSegments = longLink.split("/");

    // Strip sa/ prefix before splitting so segment counts match longLink
    const cleanLink = link.startsWith("sa/") ? link.substring(3) : link;
    const linkSegments = cleanLink.split("/").filter(p => p.length > 0);

    if (longLinkSegments.length !== linkSegments.length) {
        console.warn("Breadcrumb: longLink and link segments mismatch", { longLink, link });
        return [];
    }

    const breadcrumbs: BreadcrumbItem[] = [];

    for (let i = 0; i < linkSegments.length; i++) {
        const longLinkSegment = longLinkSegments[i];
        const linkSegment = linkSegments[i];

        // longLink segments are formatted as "Name[id]" — extract just the name
        const nameMatch = longLinkSegment.match(/^(.+?)\[\d+\]$/);
        const name = nameMatch ? nameMatch[1] : longLinkSegment;

        let type: "workspace" | "folder" | "note";
        if (linkSegment.startsWith("w")) {
            type = "workspace";
        } else if (linkSegment.startsWith("f")) {
            type = "folder";
        } else if (linkSegment.startsWith("n")) {
            type = "note";
        } else {
            console.warn("Breadcrumb: unknown link segment type", { linkSegment });
            continue;
        }

        // Build cumulative link with sa/ prefix
        const cumulativeLink = "sa/" + linkSegments.slice(0, i + 1).join("/");

        breadcrumbs.push({ type, name, link: cumulativeLink });
    }

    return breadcrumbs;
}

/**
 * Find keyword for a note by entityId (notes.id).
 */
export function findKeywordForNote(noteId: number, allKeywords: Keyword[]): Keyword | null {
    return allKeywords.find(k => k.type === "note" && k.entityId === noteId) ?? null;
}

/**
 * Find keyword for a folder by workspaceItemId.
 */
export function findKeywordForFolder(workspaceItemId: number, allKeywords: Keyword[]): Keyword | null {
    return allKeywords.find(k => k.type === "folder" && k.workspaceItemId === workspaceItemId) ?? null;
}

/**
 * Enrich breadcrumb items with color/icon from allKeywords.
 */
export function enrichBreadcrumbWithColors(
    breadcrumbs: BreadcrumbItem[],
    allKeywords?: Keyword[]
): BreadcrumbItem[] {
    if (!allKeywords || allKeywords.length === 0) return breadcrumbs;

    return breadcrumbs.map(item => {
        if (item.type !== "folder" && item.type !== "note") return item;

        const prefix = item.type === "folder" ? "f" : "n";
        const match = item.link.match(new RegExp(`\\/${prefix}(\\d+)$`));
        if (!match) return item;

        const workspaceItemId = parseInt(match[1], 10);
        const keyword = allKeywords.find(
            k => k.type === item.type && k.workspaceItemId === workspaceItemId
        );

        return keyword
            ? { ...item, color: keyword.color ?? item.color, icon: keyword.icon ?? item.icon }
            : item;
    });
}

/**
 * Build breadcrumb from workspace tree (for new notes without a keyword yet).
 */
export function buildBreadcrumbFromTree(
    noteWorkspaceItemId: number,
    noteId: number,
    noteName: string,
    workspaceFlatData: any[],
    workspaceId: number,
    workspaceName: string
): BreadcrumbItem[] {
    const itemsMap = new Map(workspaceFlatData.map(item => [item.id, item]));

    const noteItem = itemsMap.get(noteWorkspaceItemId);
    if (!noteItem) {
        // Note not yet in the tree (e.g. just created) — show workspace + note only
        return [
            { type: "workspace", name: workspaceName, link: `sa/w${workspaceId}` },
            { type: "note", name: noteName, link: `sa/w${workspaceId}/n${noteWorkspaceItemId}`, isNew: noteId < 0 },
        ];
    }

    // Walk up the tree to collect the full ancestor chain
    const pathItems: any[] = [];
    let current = noteItem;
    while (current) {
        pathItems.unshift(current);
        current = current.parentId ? itemsMap.get(current.parentId) : null;
    }

    const breadcrumbs: BreadcrumbItem[] = [
        { type: "workspace", name: workspaceName, link: `sa/w${workspaceId}` },
    ];

    for (const item of pathItems) {
        if (item.entityType === ENTITY_TYPE_FOLDER) {
            breadcrumbs.push({
                type: "folder",
                name: item.data.name,
                link: `sa/w${workspaceId}/f${item.id}`,
                color: item.data.color,
                icon: item.data.icon,
            });
        } else if (item.entityType === ENTITY_TYPE_NOTE) {
            breadcrumbs.push({
                type: "note",
                name: item.data.name,
                link: `sa/w${workspaceId}/n${item.id}`,
                color: item.data.color,
                icon: item.data.icon,
                isNew: item.data.id < 0,
            });
        }
    }

    return breadcrumbs;
}
