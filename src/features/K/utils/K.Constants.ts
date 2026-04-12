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
            k: "/k",
            ws: "/ws",
            notes: "/notes",
            project: "/project",
            lifeLog: "/lifelog",
            // @deprecated
            Kworkspace: "/Kworkspace",
        } as const,
        views: {
            workspace: "workspace",
            k: "k",
            ws: "ws",
            note: "note",
            project: "project",
            lifeLog: "lifeLog",
            // @deprecated
            Kworkspace: "Kworkspace",
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
            k: "k",
            ws: "ws",
            note: "note",
            notes: "notes",
            project: "project",
            lifeLog: "lifeLog",
            // @deprecated
            Kworkspace: "Kworkspace",
        } as const,
        displayNames: {
            note: "Note",
            workspace: "Workspace",
            k: "K",
            node: "Node",
            file: "File",
            ws: "All Workspaces",
            notes: "Notes",
            project: "Projects",
            lifeLog: "LifeLog",
            // @deprecated
            Kworkspace: "Kworkspace",
            folder: "Node",
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
            node: "node",
            k: "k",
            // @deprecated — kept for backward compat, remove after Phase 3
            folder: "node",
            note: "note",
            file: "file",
            workspace: "workspace",
        } as const,

        // Virtual node IDs
        root: {
            workspaceItemId: -12345,
            entityId: -12345,
            // @deprecated aliases
            KworkspaceItemId: -12345,
            KentityId: -12345,
        },
        dropZone: {
            workspaceItemId: -23456,
            entityId: -23456,
        },
        search: {
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
            kNode: "k-node",
            kNodePanelBlank: "k-node-panel-blank",
            kNodePanelCard: "k-node-panel-card",
            // @deprecated aliases — remove after Phase 3
            kFolder: "k-node",
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
        k: "K",
        ws: "Ws",
        task: "Task",
        project: "Project",
        lifeLog: "LifeLog",
        // @deprecated
        Kworkspace: "K",
    } as const,

    color: [
        { value: "#90A4AE", label: "Grey" },
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
