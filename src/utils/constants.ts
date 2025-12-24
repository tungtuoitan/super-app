/**
 * Static Constants
 * Non-configuration constants used throughout the app
 */



export const constants = {
    note: {
        
    },
    environments: {
        development: 'development',
        production: 'production',
    } as const,

    tabTypes: {
        note: "note",
        workspace: "workspace",
    } as const,

    itemTypes: {
        note: "note",
        workspace: "workspace",
        file: "file",
        folder: "folder",
        tag: "tag",
    } as const,

    contextMenuTypes: {
        default: "default",
        tag: "tag",
        note: "note",
        file: "file",
        folder: "folder",
        noteGrid: "note-grid",
        workspaceGrid: "workspace-grid",
    } as const,

    viewTypes: {
        workspace: "workspace",
        workspaceList: "workspaceList",
        note: "note",
        notes: "notes",
    } as const,

    displayNames: {
        note: "Note",
        workspace: "Workspace",
        file: "File",
        folder: "Folder",
        notes: "Notes",
    } as const,

    pagination: {
        defaultPageSize: 25,
        pageSizeOptions: [25, 50, 100],
    } as const,

    grid: {
        rowHeight: 50,
        headerHeight: 52,
        columnBuffer: 150,
        rowBuffer: 250,
    } as const,

    workspace: {
        rootId: -12345, // Virtual ID for workspace root node
    } as const,

    activeStatus: {
        active: "active",
        inactive: "inactive",
    } as const,

    activeStatusOptions: [
        { id: "active", code: "active", desc: "Active", label: "Active" },
        {
            id: "inactive",
            code: "inactive",
            desc: "Inactive",
            label: "Inactive",
        },
    ] as const,
} as const;
