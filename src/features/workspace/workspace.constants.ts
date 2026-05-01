/**
 * Workspace Feature Constants
 * Item types, virtual node IDs, search configuration
 */

export const workspaceConstants = {
    itemTypes: {
        node: "node",
        k: "k",
        note: "note",
        file: "file",
        workspace: "workspace",
        // @deprecated — use node
        folder: "node",
    } as const,

    // Virtual node IDs
    root: {
        workspaceItemId: -12345,
        entityId: -12345,
    },
    dropZone: {
        workspaceItemId: -23456,
        entityId: -23456,
    },
    search: {
        mode: "showAllDescendants" as "showAllDescendants" | "exactMatchOnly",
    },
} as const;
