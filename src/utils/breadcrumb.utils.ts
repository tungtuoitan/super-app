/**
 * Breadcrumb utilities for EditorToolbar
 * Parse keywords to generate breadcrumb navigation paths
 */

import type { Keyword } from "@/types/keyword.types";

/**
 * Breadcrumb item representing a segment in the navigation path
 */
export interface BreadcrumbItem {
    type: "workspace" | "folder" | "note";
    name: string;
    link: string; // Keyword link for navigation (e.g., "w77", "w77/f183", "w77/f183/n185")
    color?: string; // For folders (will be populated from workspace data if available)
    icon?: string; // Icon type for folders (e.g., "TASK", "IMAGE", etc.)
    isNew?: boolean; // For new notes (ID < 0) - will be displayed in purple
}

/**
 * Parse keyword longLink and link to generate breadcrumb items
 *
 * Example:
 * - longLink: "Workspace A[1]/Folder B[2]/Note C[3]"
 * - link: "w77/f183/n185"
 *
 * Returns:
 * [
 *   { type: 'workspace', name: 'Workspace A', link: 'w77' },
 *   { type: 'folder', name: 'Folder B', link: 'w77/f183' },
 *   { type: 'note', name: 'Note C', link: 'w77/f183/n185' }
 * ]
 */
export function parseBreadcrumbFromKeyword(keyword: Keyword): BreadcrumbItem[] {
    const { longLink, link } = keyword;

    if (!longLink || !link) {
        return [];
    }

    // Parse longLink to get names: "Workspace A[1]/Folder B[2]/Note C[3]"
    const longLinkSegments = longLink.split("/");

    // Parse link to get paths: "w77/f183/n185"
    const linkSegments = link.split("/");

    // Must have same number of segments
    if (longLinkSegments.length !== linkSegments.length) {
        console.warn("Breadcrumb: longLink and link segments mismatch", { longLink, link });
        return [];
    }

    const breadcrumbs: BreadcrumbItem[] = [];

    for (let i = 0; i < longLinkSegments.length; i++) {
        const longLinkSegment = longLinkSegments[i];
        const linkSegment = linkSegments[i];

        // Extract name from longLink segment by removing [index]
        // Example: "Workspace A[1]" -> "Workspace A"
        const nameMatch = longLinkSegment.match(/^(.+?)\[\d+\]$/);
        const name = nameMatch ? nameMatch[1] : longLinkSegment;

        // Determine type from link segment
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

        // Build cumulative link path
        // Example: i=0 -> "w77", i=1 -> "w77/f183", i=2 -> "w77/f183/n185"
        const cumulativeLink = linkSegments.slice(0, i + 1).join("/");

        breadcrumbs.push({
            type,
            name,
            link: cumulativeLink,
        });
    }

    return breadcrumbs;
}

/**
 * Find keyword for a note by entityId
 * Now uses entityId directly instead of parsing link patterns
 *
 * @param noteId - Note entity ID (notes.id)
 * @param allKeywords - All loaded keywords
 * @returns Matching keyword or null
 */
export function findKeywordForNote(
    noteId: number,
    allKeywords: Keyword[]
): Keyword | null {
    // Find keyword with type='note' and entityId matching noteId
    const matchingKeyword = allKeywords.find(keyword =>
        keyword.type === 'note' && keyword.entityId === noteId
    );

    return matchingKeyword || null;
}

/**
 * Find keyword for a folder by workspaceItemId
 * Now uses workspaceItemId directly instead of parsing link patterns
 *
 * @param workspaceItemId - Workspace item ID (workspace_items.id)
 * @param allKeywords - All loaded keywords
 * @returns Matching keyword or null
 */
export function findKeywordForFolder(
    workspaceItemId: number,
    allKeywords: Keyword[]
): Keyword | null {
    return allKeywords.find(k =>
        k.type === 'folder' && k.workspaceItemId === workspaceItemId
    ) || null;
}

/**
 * Enrich breadcrumb items with folder and note colors and icons
 * Prioritizes allKeywords (source of truth) over workspaceFlatData
 *
 * @param breadcrumbs - Base breadcrumb items
 * @param allKeywords - All keywords with color/icon info (preferred source)
 * @returns Breadcrumb items with folder and note colors and icons populated
 */
export function enrichBreadcrumbWithColors(
    breadcrumbs: BreadcrumbItem[],
    allKeywords?: Keyword[]
): BreadcrumbItem[] {
    return breadcrumbs.map(item => {
        // Only enrich folders and notes
        if (item.type !== 'folder' && item.type !== 'note') {
            return item;
        }

        if (item.type === 'folder') {
            // Extract folder workspace item ID from link
            // Example: "w77/f183" -> 183
            const folderMatch = item.link.match(/\/f(\d+)$/);
            if (!folderMatch) {
                return item;
            }

            const folderWorkspaceItemId = parseInt(folderMatch[1], 10);

            // Get color and icon from allKeywords (source of truth)
            if (allKeywords && allKeywords.length > 0) {
                const folderKeyword = allKeywords.find(
                    k => k.type === 'folder' && k.workspaceItemId === folderWorkspaceItemId
                );

                if (folderKeyword) {
                    return {
                        ...item,
                        color: folderKeyword.color || item.color,
                        icon: folderKeyword.icon || item.icon,
                    };
                }
            }
        } else if (item.type === 'note') {
            // Extract note workspace item ID from link
            // Example: "w77/f183/n185" -> 185 or "w77/n185" -> 185
            const noteMatch = item.link.match(/\/n(\d+)$/);
            if (!noteMatch) {
                return item;
            }

            const noteWorkspaceItemId = parseInt(noteMatch[1], 10);

            // Get color and icon from allKeywords (source of truth)
            if (allKeywords && allKeywords.length > 0) {
                const noteKeyword = allKeywords.find(
                    k => k.type === 'note' && k.workspaceItemId === noteWorkspaceItemId
                );

                if (noteKeyword) {
                    return {
                        ...item,
                        color: noteKeyword.color || item.color,
                        icon: noteKeyword.icon || item.icon,
                    };
                }
            }
        }

        return item;
    });
}

/**
 * Build breadcrumb from workspace tree (for new notes without keywords)
 * Traverses from note up to workspace root
 *
 * @param noteWorkspaceItemId - workspace_items.id of the note
 * @param noteId - notes.id (entity ID)
 * @param noteName - Note name
 * @param workspaceFlatData - Workspace flat data
 * @param workspaceId - Workspace entity ID
 * @param workspaceName - Workspace name
 * @returns Breadcrumb items array
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

    // Find the note item
    const noteItem = itemsMap.get(noteWorkspaceItemId);
    if (!noteItem) {
        // Fallback: just workspace + note
        return [
            {
                type: 'workspace',
                name: workspaceName,
                link: `w${workspaceId}`,
            },
            {
                type: 'note',
                name: noteName,
                link: `w${workspaceId}/n${noteWorkspaceItemId}`,
                isNew: noteId < 0,
            },
        ];
    }

    // Traverse up the tree to collect all parent folders
    const pathItems: any[] = [];
    let currentItem = noteItem;

    while (currentItem) {
        pathItems.unshift(currentItem); // Add to beginning

        if (currentItem.parentId) {
            currentItem = itemsMap.get(currentItem.parentId);
        } else {
            break;
        }
    }

    // Build breadcrumb items
    // Start with workspace
    breadcrumbs.push({
        type: 'workspace',
        name: workspaceName,
        link: `w${workspaceId}`,
    });

    // Add intermediate folders and final note
    for (const item of pathItems) {
        if (item.entityType === 2) {
            // Folder
            breadcrumbs.push({
                type: 'folder',
                name: item.data.name,
                link: `w${workspaceId}/f${item.id}`,
                color: item.data.color,
                icon: item.data.icon,
            });
        } else if (item.entityType === 3) {
            // Note (last item)
            breadcrumbs.push({
                type: 'note',
                name: item.data.name,
                link: `w${workspaceId}/n${item.id}`,
                color: item.data.color,
                icon: item.data.icon,
                isNew: item.data.id < 0,
            });
        }
    }

    return breadcrumbs;
}
