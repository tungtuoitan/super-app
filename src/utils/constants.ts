/**
 * Static Constants
 * Non-configuration constants used throughout the app
 */

import type * as _monaco from "monaco-editor";

export const constants = {
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
            // @deprecated — use k
            Kworkspace: "/k",
        } as const,
        views: {
            workspace: "workspace",
            k: "k",
            ws: "ws",
            note: "note",
            project: "project",
            lifeLog: "lifeLog",
            // @deprecated — use k
            Kworkspace: "k",
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
            // @deprecated — use k
            Kworkspace: "k",
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
            // @deprecated — use node
            folder: "Node",
            // @deprecated — use k
            Kworkspace: "K",
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
            note: "note",
            file: "file",
            workspace: "workspace",
            // @deprecated — use node
            folder: "node",
            // @deprecated — use node
            Kfolder: "node",
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
            kNote: "k-note",
            kFile: "k-file",
            // @deprecated — use kNode
            kFolder: "k-node",
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
            { id: "inactive", code: "inactive", desc: "Inactive", label: "Inactive" },
        ] as const,
    },

    modules: {
        note: "Note",
        workspace: "Workspace",
        k: "K",
        ws: "Ws",
        task: "Task",
        project: "Project",
        lifeLog: "LifeLog",
        // @deprecated — use k
        Kworkspace: "K",
    } as const,

    // Status and Priority colors (GitHub-style)
    optionColor: {
        projectStatus: {
            colors: {
                paused: { bg: "#805f52", text: "#ffffff" },
                active: { bg: "#0969da", text: "#ffffff" },
                completed: { bg: "#1a7f64", text: "#ffffff" },
                dropped: { bg: "#57606a", text: "#ffffff" },
            } as Record<string, { bg: string; text: string }>,
            default: { bg: "#57606a", text: "#ffffff" },
        } as const,
        timelinePro: {
            colors: {
                paused:    { bg: "#805f52", text: "#E5E7EB" },
                active:    { bg: "#1E3A8A", text: "#E5E7EB" },
                completed: { bg: "#1F5E4B", text: "#E5E7EB" },
                dropped:   { bg: "#374151", text: "#E5E7EB" },
            } as Record<string, { bg: string; text: string }>,
            default: { bg: "#374151", text: "#E5E7EB" },
        } as const,
        taskStatus: {
            colors: {
                open: { bg: "#1f6f43", text: "#ffffff" },
                in_progress: { bg: "#52400c", text: "#ffffff" },
                completed: { bg: "#6f42c1", text: "#ffffff" },
                on_hold: { bg: "#4b5563", text: "#ffffff" },
                cancelled: { bg: "#a63636", text: "#ffffff" },
            } as Record<string, { bg: string; text: string }>,
            default: { bg: "#4b5563", text: "#ffffff" },
        } as const,
        timelineTask: {
            colors: {
                open: { bg: "#09331c", text: "#E5E7EB" },
                in_progress: { bg: "#6e560b", text: "#E5E7EB" },
                completed: { bg: "#311a5e", text: "#E5E7EB" },
                on_hold: { bg: "#2B2F45", text: "#E5E7EB" },
                cancelled: { bg: "#4A2E3A", text: "#E5E7EB" },
            } as Record<string, { bg: string; text: string }>,
            default: { bg: "#2b3038", text: "#E5E7EB" },
        } as const,
        taskPriority: {
            colors: {
                low: { bg: "#6e7681", text: "#ffffff" },
                medium: { bg: "#d29922", text: "#ffffff" },
                high: { bg: "#da3633", text: "#ffffff" },
                urgent: { bg: "rgb(255, 0, 0)", text: "#ffffff" },
            } as Record<string, { bg: string; text: string }>,
            default: { bg: "#6e7681", text: "#ffffff" },
        } as const,
    },
    optionOrder: {
        projectStatuses: {
            Paused: 1,
            Active: 2,
            Completed: 3,
            Dropped: 4,
        } as Record<string, number>,
        taskStatuses: {
            Open: 1,
            "In Progress": 2,
            Completed: 3,
            "On Hold": 4,
            Cancelled: 5,
        } as Record<string, number>,
        taskPriorities: {
            Low: 1,
            Medium: 2,
            High: 3,
            Urgent: 4,
        } as Record<string, number>,
    },
    filters: {
        views: {
            noteGrid: "noteGrid",
            wsGrid: "wsGrid",
            workspace: "workspace",
            k: "k",
            projectGrid: "projectGrid",
            // @deprecated — use k
            Kworkspace: "k",
        } as const,
        defaults: {
            noteGrid: { statusCode: "active", deletedAt: "null" },
            wsGrid: { statusCode: "active", deletedAt: "null" },
            workspace: { statusCode: "active", deletedAt: "null" },
            k: { statusCode: "active", deletedAt: "null" },
            // @deprecated — use k
            Kworkspace: { statusCode: "active", deletedAt: "null" },
            projectGrid: { statusCode: "active" },
            taskGrid: { status: "open,in_progress", priority: "low,medium,high" },
        } as const,
        taskDefaults: {
            status: "open,in_progress",
            priority: "low,medium,high",
        } as const,
        taskGroups: [
            { key: "status", label: "Status", standardRegistryType: "task_status" },
            { key: "priority", label: "Priority", standardRegistryType: "task_priority" },
        ] as const,
        groups: {
            noteGrid: [
                { key: "statusCode", label: "Status", type: "checkbox", standardRegistryType: "noteStatus", defaultValue: "active" },
                { key: "deletedAt", label: "Deleted Status", type: "radio", defaultValue: "null" },
                { key: "createdAt", label: "Created Date", type: "dateRange", defaultValue: "" },
            ],
            wsGrid: [
                { key: "statusCode", label: "Status", type: "checkbox", standardRegistryType: "workspaceStatus", defaultValue: "active" },
                { key: "deletedAt", label: "Deleted Status", type: "radio", defaultValue: "null" },
                { key: "createdAt", label: "Created Date", type: "dateRange", defaultValue: "" },
            ],
            workspace: [
                { key: "statusCode", label: "Status", type: "checkbox", standardRegistryType: "noteStatus", defaultValue: "active" },
                { key: "deletedAt", label: "Deleted Status", type: "checkbox", defaultValue: "null" },
            ],
            k: [
                { key: "statusCode", label: "Status", type: "checkbox", standardRegistryType: "noteStatus", defaultValue: "active" },
                { key: "deletedAt", label: "Deleted Status", type: "checkbox", defaultValue: "null" },
            ],
            projectGrid: [
                { key: "statusCode", label: "Status", type: "checkbox", standardRegistryType: "project_status", defaultValue: "active" },
            ],
            taskGrid: [
                { key: "status", label: "Status", type: "checkbox", standardRegistryType: "task_status", defaultValue: "open,in_progress" },
                { key: "priority", label: "Priority", type: "checkbox", standardRegistryType: "task_priority", defaultValue: "low,medium,high" },
            ],
        } as const,
    },

    markdown: {
        theme: {
            name: "custom-dark",
            config: {
                base: "vs-dark",
                inherit: true,
                rules: [
                    { token: "string.link.markdown", foreground: "D4D4D4" },
                    { token: "string", foreground: "D4D4D4" },
                    { token: "meta.link.inline.markdown", foreground: "D4D4D4" },
                ],
                colors: {
                    "editor.background": "#09090B",
                    "editor.foreground": "#D4D4D4",
                    "editorLineNumber.foreground": "#858585",
                    "editorCursor.foreground": "#AEAFAD",
                    "editor.selectionBackground": "#264F78",
                    "editor.inactiveSelectionBackground": "#3A3D41",
                },
            } as _monaco.editor.IStandaloneThemeData,
        },
        editor: {
            fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace",
            options: (disabled: boolean, value: string) =>
                ({
                    value,
                    language: "markdown",
                    theme: "custom-dark",
                    minimap: { enabled: false },
                    wordWrap: "on",
                    fontSize: 14,
                    fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace",
                    lineNumbers: "on",
                    lineNumbersMinChars: 3,
                    lineDecorationsWidth: 16,
                    folding: true,
                    foldingStrategy: "auto",
                    showFoldingControls: "mouseover",
                    glyphMargin: true,
                    readOnly: disabled,
                    scrollBeyondLastLine: true,
                    padding: { top: 20, bottom: 200 },
                    automaticLayout: true,
                    rulers: [],
                    renderLineHighlight: "none",
                    quickSuggestions: { other: true, comments: true, strings: true },
                    acceptSuggestionOnCommitCharacter: true,
                    acceptSuggestionOnEnter: "on",
                    wordBasedSuggestions: "off",
                    suggest: {
                        showWords: false,
                        showKeywords: true,
                        snippetsPreventQuickSuggestions: false,
                        localityBonus: true,
                        shareSuggestSelections: false,
                    },
                    parameterHints: { enabled: true },
                }) as _monaco.editor.IStandaloneEditorConstructionOptions,
        },
    } as const,

    keywordIcons: {
        workspace: "folder",
        folder: "folder",
        note: "file",
        file: "file",
        h1: "text",
        h2: "text",
        h3: "text",
        h4: "text",
        h5: "text",
        h6: "text",
        external: "reference",
        hashtag: "color",
        status: "enum",
        keyword: "keyword",
        class: "class",
        type: "interface",
        comment: "snippet",
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

// Type exports
export type ActivityBarView =
    | typeof constants.navigation.views.workspace
    | typeof constants.navigation.views.k
    | typeof constants.navigation.views.ws
    | typeof constants.navigation.views.note
    | typeof constants.navigation.views.project
    | typeof constants.navigation.views.lifeLog;
