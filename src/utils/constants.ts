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
            ws: "/ws",
            notes: "/notes",
        } as const,
        views: {
            workspace: "workspace",
            ws: "ws",
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
            ws: "ws",
            note: "note",
            notes: "notes",
        } as const,
        displayNames: {
            note: "Note",
            workspace: "Workspace",
            ws: "All Workspaces",
            file: "File",
            folder: "Folder",
            notes: "Notes",
        } as const,
        tabTitles: {
            unsavedNote: "Unsaved Note",
            unsavedWorkspace: "Unsaved Workspace",
            unknownTab: "Unknown Tab",
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
        types: {
            hashtag: "hashtag",
            entity: "entity",
            workspaceStatus: "workspaceStatus",
            noteStatus: "noteStatus",
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
    },

    modules: {
        note: "Note",
        workspace: "Workspace",
        task: "Task",
    } as const,
    filters: {
        // Filter view keys
        views: {
            noteGrid: "noteGrid",
            wsGrid: "wsGrid",
            workspace: "workspace",
        } as const,

        // Default filter values for each view
        defaults: {
            noteGrid: {
                statusCode: "active",
                deletedAt: "null",
            },
            wsGrid: {
                statusCode: "active",
                deletedAt: "null",
            },
            workspace: {
                statusCode: "active",
                deletedAt: "null",
            },
        } as const,

        // Filter field configurations
        groups: {
            noteGrid: [
                {
                    key: "statusCode",
                    label: "Status",
                    type: "radio",
                    standardRegistryType: "noteStatus",
                    defaultValue: "active",
                },
                {
                    key: "deletedAt",
                    label: "Deleted Status",
                    type: "radio",
                    defaultValue: "null",
                },
                {
                    key: "createdAt",
                    label: "Created Date",
                    type: "dateRange",
                    defaultValue: "",
                },
            ],
            wsGrid: [
                {
                    key: "statusCode",
                    label: "Status",
                    type: "radio",
                    standardRegistryType: "workspaceStatus",
                    defaultValue: "active",
                },
                {
                    key: "deletedAt",
                    label: "Deleted Status",
                    type: "radio",
                    defaultValue: "null",
                },
                {
                    key: "createdAt",
                    label: "Created Date",
                    type: "dateRange",
                    defaultValue: "",
                },
            ],
            workspace: [
                {
                    key: "statusCode",
                    label: "Status",
                    type: "radio",
                    standardRegistryType: "noteStatus", // Reuse noteStatus registry (notes/files have status, folders don't)
                    defaultValue: "active",
                },
                {
                    key: "deletedAt",
                    label: "Deleted Status",
                    type: "checkbox",
                    defaultValue: "null",
                },
            ],
        } as const,
    },
} as const;

// Type exports
export type ActivityBarView = typeof constants.navigation.views.workspace | typeof constants.navigation.views.ws | typeof constants.navigation.views.note;
