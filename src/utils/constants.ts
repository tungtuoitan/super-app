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
        } as const,

        // Virtual node IDs for workspace root
        root: {
            workspaceItemId: -12345, // workspace_items.id for root node
            entityId: -12345, // folders.id for root node (same value for simplicity)
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
        ws: "Ws",
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

    markdown: {
        // ==================== Monaco Editor Configuration ====================
        theme: {
            name: "custom-dark",
            config: {
                base: "vs-dark",
                inherit: true,
                rules: [
                    // Override markdown link colors to be white (default text color)
                    { token: "string.link.markdown", foreground: "D4D4D4" },
                    { token: "string", foreground: "D4D4D4" },
                    { token: "meta.link.inline.markdown", foreground: "D4D4D4" },
                    // { token: "markup.underline.link.markdown", foreground: "D4D4D4" },
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
                    wordWrap: "on", // Wrap at viewport width
                    fontSize: 14,
                    fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Courier New', monospace",
                    lineNumbers: "on", // Bật line numbers để hiển thị fold indicators
                    lineNumbersMinChars: 3,
                    lineDecorationsWidth: 16, // Space cho fold icons (tăng lên)
                    folding: true, // Bật folding cho markdown headings
                    foldingStrategy: "auto", // Auto detect folding
                    showFoldingControls: "mouseover", // Hiển thị khi hover
                    glyphMargin: true, // Bật glyph margin cho fold icons
                    readOnly: disabled,
                    scrollBeyondLastLine: true, // Cho phép scroll xuống dưới dòng cuối (~10 lines)
                    padding: { top: 0, bottom: 200 }, // Khoảng trống ~10 lines ở cuối (10 * 20px)
                    automaticLayout: true,
                    rulers: [],
                    renderLineHighlight: "none",
                    // Markdown-specific options
                    quickSuggestions: {
                        other: true,
                        comments: true,
                        strings: true,
                    },
                    acceptSuggestionOnCommitCharacter: true,
                    acceptSuggestionOnEnter: "on", // Only accept with Tab, Enter for new line
                    wordBasedSuggestions: "off", // Turn off default word-based suggestions to prioritize custom keywords
                    suggest: {
                        showWords: false, // Don't suggest random words from the document
                        showKeywords: true,
                        snippetsPreventQuickSuggestions: false,
                        localityBonus: true,
                        shareSuggestSelections: false,
                    },
                    parameterHints: {
                        enabled: true,
                    },
                } as _monaco.editor.IStandaloneEditorConstructionOptions),
        },
    } as const,

    // Keyword type icons mapping (for autocomplete and command palette)
    keywordIcons: {
        workspace: "folder", // Monaco CompletionItemKind.Folder
        folder: "folder",
        note: "file",
        file: "file",
        h1: "text", // Monaco CompletionItemKind.Text for headings
        h2: "text",
        h3: "text",
        h4: "text",
        h5: "text",
        h6: "text",
        external: "reference", // Monaco CompletionItemKind.Reference
        hashtag: "color", // Monaco CompletionItemKind.Color
        status: "enum", // Monaco CompletionItemKind.Enum
        keyword: "keyword",
        class: "class",
        type: "interface",
        comment: "snippet",
    } as const,
} as const;

// Type exports
export type ActivityBarView = typeof constants.navigation.views.workspace | typeof constants.navigation.views.ws | typeof constants.navigation.views.note;
