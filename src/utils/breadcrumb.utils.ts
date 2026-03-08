/**
 * Breadcrumb utilities for EditorToolbar
 */

import type { Keyword } from "@/types/keyword.types";

export interface BreadcrumbItem {
    type: "workspace" | "folder" | "note";
    name: string;
    link: string; // Full sa/ link for navigation
    color?: string;
    icon?: string;
    isNew?: boolean;
}

/**
 * Parse keyword longLink + link into breadcrumb items.
 *
 * Example:
 *   link:     "sa/w77/f183/n185"
 *   longLink: "Workspace A/Folder B/Note C"
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
        if (item.type === "folder") {
            const folderMatch = item.link.match(/\/f(\d+)$/);
            if (!folderMatch) return item;

            const folderWorkspaceItemId = parseInt(folderMatch[1], 10);
            const folderKeyword = allKeywords.find(
                k => k.type === "folder" && k.workspaceItemId === folderWorkspaceItemId
            );

            return folderKeyword
                ? { ...item, color: folderKeyword.color ?? item.color, icon: folderKeyword.icon ?? item.icon }
                : item;
        }

        if (item.type === "note") {
            const noteMatch = item.link.match(/\/n(\d+)$/);
            if (!noteMatch) return item;

            const noteWorkspaceItemId = parseInt(noteMatch[1], 10);
            const noteKeyword = allKeywords.find(
                k => k.type === "note" && k.workspaceItemId === noteWorkspaceItemId
            );

            return noteKeyword
                ? { ...item, color: noteKeyword.color ?? item.color, icon: noteKeyword.icon ?? item.icon }
                : item;
        }

        return item;
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
    const breadcrumbs: BreadcrumbItem[] = [];
    const itemsMap = new Map(workspaceFlatData.map(item => [item.id, item]));

    const noteItem = itemsMap.get(noteWorkspaceItemId);
    if (!noteItem) {
        return [
            { type: "workspace", name: workspaceName, link: `sa/w${workspaceId}` },
            { type: "note", name: noteName, link: `sa/w${workspaceId}/n${noteWorkspaceItemId}`, isNew: noteId < 0 },
        ];
    }

    const pathItems: any[] = [];
    let current = noteItem;

    while (current) {
        pathItems.unshift(current);
        current = current.parentId ? itemsMap.get(current.parentId) : null;
    }

    breadcrumbs.push({ type: "workspace", name: workspaceName, link: `sa/w${workspaceId}` });

    for (const item of pathItems) {
        if (item.entityType === 2) {
            breadcrumbs.push({
                type: "folder",
                name: item.data.name,
                link: `sa/w${workspaceId}/f${item.id}`,
                color: item.data.color,
                icon: item.data.icon,
            });
        } else if (item.entityType === 3) {
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
