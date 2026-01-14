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
 * Find keyword for a note in a specific workspace
 *
 * @param noteId - Note entity ID (notes.id)
 * @param workspaceId - Workspace entity ID (workspaces.id)
 * @param workspaceItemId - Workspace item ID (workspace_items.id)
 * @param allKeywords - All loaded keywords
 * @returns Matching keyword or null
 */
export function findKeywordForNote(
    noteId: number,
    workspaceId: number,
    workspaceItemId: number,
    allKeywords: Keyword[]
): Keyword | null {
    // Find keyword with:
    // 1. type === 'note' (or h1-h6 for headings)
    // 2. link starts with "w{workspaceId}"
    // 3. link contains "n{workspaceItemId}"

    const targetLinkPattern = `w${workspaceId}`;
    const notePattern = `n${workspaceItemId}`;

    const matchingKeyword = allKeywords.find(keyword => {
        // Must be note type (or heading which also represents a note)
        const isNoteType = keyword.type === 'note' ||
                          keyword.type === 'h1' ||
                          keyword.type === 'h2' ||
                          keyword.type === 'h3' ||
                          keyword.type === 'h4' ||
                          keyword.type === 'h5' ||
                          keyword.type === 'h6';

        if (!isNoteType) return false;

        // Must start with correct workspace
        if (!keyword.link.startsWith(targetLinkPattern)) return false;

        // Must contain the note workspace item ID
        // Example: "w77/n185" or "w77/f183/n185"
        return keyword.link.includes(`/${notePattern}`) || keyword.link.endsWith(notePattern);
    });

    return matchingKeyword || null;
}

/**
 * Find keyword for a workspace/folder
 *
 * @param workspaceId - Workspace entity ID (workspaces.id)
 * @param workspaceItemId - Workspace item ID (workspace_items.id) - optional for workspace root
 * @param allKeywords - All loaded keywords
 * @returns Matching keyword or null
 */
export function findKeywordForWorkspace(
    workspaceId: number,
    workspaceItemId: number | null,
    allKeywords: Keyword[]
): Keyword | null {
    if (workspaceItemId === null) {
        // Workspace root - find by workspace ID only
        return allKeywords.find(k => k.type === 'workspace' && k.link === `w${workspaceId}`) || null;
    } else {
        // Folder - find by workspace ID and folder item ID
        const folderPattern = `f${workspaceItemId}`;
        return allKeywords.find(k =>
            k.type === 'folder' &&
            k.link.startsWith(`w${workspaceId}`) &&
            (k.link.includes(`/${folderPattern}`) || k.link.endsWith(folderPattern))
        ) || null;
    }
}

/**
 * Enrich breadcrumb items with folder colors from workspace data
 *
 * @param breadcrumbs - Base breadcrumb items
 * @param workspaceFlatData - Workspace flat data containing folder colors
 * @returns Breadcrumb items with folder colors populated
 */
export function enrichBreadcrumbWithColors(
    breadcrumbs: BreadcrumbItem[],
    workspaceFlatData: any[] | undefined
): BreadcrumbItem[] {
    if (!workspaceFlatData || workspaceFlatData.length === 0) {
        return breadcrumbs;
    }

    return breadcrumbs.map(item => {
        // Only enrich folders
        if (item.type !== 'folder') {
            return item;
        }

        // Extract folder workspace item ID from link
        // Example: "w77/f183" -> 183
        const folderMatch = item.link.match(/\/f(\d+)$/);
        if (!folderMatch) {
            return item;
        }

        const folderWorkspaceItemId = parseInt(folderMatch[1], 10);

        // Find folder in workspace flat data
        const folderData = workspaceFlatData.find(
            (wsItem: any) => wsItem.entityType === 2 && wsItem.id === folderWorkspaceItemId
        );

        if (folderData?.data?.color) {
            return {
                ...item,
                color: folderData.data.color,
            };
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
            });
        } else if (item.entityType === 3) {
            // Note (last item)
            breadcrumbs.push({
                type: 'note',
                name: item.data.name,
                link: `w${workspaceId}/n${item.id}`,
                isNew: item.data.id < 0,
            });
        }
    }

    return breadcrumbs;
}
