/**
 * Static Constants
 * Non-configuration constants used throughout the app
 */

export const constants = {
    note: {},
    environments: {
        development: "development",
        production: "production",
    },
    navigation: {
        path: {
            home: "/",
            workspace: "/workspace",
            workspaceList: "/workspaceList",
            notes: "/notes",
        } as const,
        views: {
            workspace: "workspace",
            workspaceList: "workspaceList",
            note: "note",
        } as const,
    },
    vscode: {
        tab: {
            tabTypes: {
                note: "note",
                workspace: "workspace",
            } as const,
        },
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
    },
    workspace: {
        itemTypes: {
            note: "note",
            workspace: "workspace",
            file: "file",
            folder: "folder",
            tag: "tag",
        } as const,
        rootId: -12345, // Virtual ID for workspace root node
    },

    contextMenu: {
        contextMenuTypes: {
            default: "default",
            tag: "tag",
            note: "note",
            file: "file",
            folder: "folder",
            noteGrid: "note-grid",
            workspaceGrid: "workspace-grid",
        } as const,
    },

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

    standardRegistryFE: {
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
    },
} as const;

// Type exports
export type ActivityBarView = typeof constants.navigation.views.workspace | typeof constants.navigation.views.workspaceList | typeof constants.navigation.views.note;
