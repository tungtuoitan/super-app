/**
 * Static Constants
 * Non-configuration kconstants used throughout the app
 */

import type * as _monaco from "monaco-editor";

export const kconstants = {
    environments: {
        development: "development",
        production: "production",
    },
    navigation: {
        path: {
            home: "/",
            workspace: "/workspace",
            Kworkspace: "/Kworkspace",
            ws: "/ws",
            notes: "/notes",
            project: "/project",
            lifeLog: "/lifelog",
        } as const,
        views: {
            workspace: "workspace",
            Kworkspace: "Kworkspace",
            ws: "ws",
            note: "note",
            project: "project",
            lifeLog: "lifeLog",
        } as const,
    },
    vscode: {
        tab: {
            tabTypes: {
                note: "note",
                workspace: "workspace",
                trackingGraph: "trackingGraph",
                project: "project",
                multiProject: "multiProject",
                task: "task",
                lifeLog: "lifeLog",
                lifeLogGraph: "lifeLogGraph",
                lifeLogTrack: "lifeLogTrack",
            } as const,
        },
        viewTypes: {
            workspace: "workspace",
            Kworkspace: "Kworkspace",
            ws: "ws",
            note: "note",
            notes: "notes",
            project: "project",
            lifeLog: "lifeLog",
        } as const,
        displayNames: {
            note: "Note",
            workspace: "Workspace",
            Kworkspace: "Kworkspace",
            file: "File",
            ws: "All Workspaces",
            folder: "Folder",
            notes: "Notes",
            project: "Projects",
            lifeLog: "LifeLog",
        } as const,
        tabTitles: {
            unsavedNote: "Unsaved Note",
            unsavedWorkspace: "Unsaved Workspace",
            unsavedProject: "Unsaved Project",
            unsavedTask: "Unsaved Task",
            unknownTab: "Unknown Tab",
        } as const,
    },
    workspace: {
        itemTypes: {
            note: "note",
            workspace: "workspace",
            file: "file",
            folder: "folder",
        } as const,

        // Virtual node IDs for workspace root
        root: {
            workspaceItemId: -12345, // workspace_items.id for root node
            KworkspaceItemId: -12345, // workspace_items.id for root node
            entityId: -12345, // folders.id for root node (same value for simplicity)
            KentityId: -12345, // folders.id for root node (same value for simplicity)
        },

        // Virtual node IDs for drop zone
        dropZone: {
            workspaceItemId: -23456, // workspace_items.id for drop zone
            entityId: -23456, // folders.id for drop zone (same value for simplicity)
        },

        // Search behavior configuration
        search: {
            /**
             * Search mode for tree filtering
             * - "showAllDescendants": When folder X matches search, show X + all its children/grandchildren
             * - "exactMatchOnly": When folder X matches search, show only X (hide children unless they also match)
             *
             * Default: "showAllDescendants"
             */
            mode: "showAllDescendants" as "showAllDescendants" | "exactMatchOnly",
        },
    },

    contextMenu: {
        contextMenuTypes: {
            default: "default",
            note: "note",
            file: "file",
            folder: "folder",
            noteGrid: "note-grid",
            workspaceGrid: "workspace-grid",
            projectGrid: "project-grid",
            taskGrid: "task-grid",
            tab: "tab",
            lifeLogLog: "lifelog-log",
            lifeLogTrack: "lifelog-track",
            kFolder: "k-folder",
            kNote: "k-note",
            kFile: "k-file",
        } as const,
    },
    standardRegistryFE: {
        types: {
            hashtag: "hashtag",
            entity: "entity",
            workspaceStatus: "workspaceStatus",
            noteStatus: "noteStatus",
        } as const,
    },

    modules: {
        note: "Note",
        workspace: "Workspace",
        Kworkspace: "Kworkspace",
        ws: "Ws",
        task: "Task",
        project: "Project",
        lifeLog: "LifeLog"
    } as const,



    color: [
        // Material Design Icons for VS Code color palette
        { value: "#90A4AE", label: "Grey" }, // Default
        { value: "#42A5F5", label: "Blue" },
        { value: "#29B6F6", label: "Light Blue" },
        { value: "#26C6DA", label: "Cyan" },
        { value: "#26A69A", label: "Teal" },
        { value: "#66BB6A", label: "Green" },
        { value: "#9CCC65", label: "Light Green" },
        { value: "#D4E157", label: "Lime" },
        { value: "#FFEE58", label: "Yellow" },
        { value: "#FFCA28", label: "Amber" },
        { value: "#FFA726", label: "Orange" },
        { value: "#FF7043", label: "Deep Orange" },
        { value: "#EF5350", label: "Red" },
        { value: "#EC407A", label: "Pink" },
        { value: "#AB47BC", label: "Purple" },
        { value: "#7E57C2", label: "Deep Purple" },
        { value: "#5C6BC0", label: "Indigo" },
        { value: "#8D6E63", label: "Brown" },
    ],
} as const;
