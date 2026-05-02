/**
 * Context Menu Type Constants
 * Single source of truth for all menu IDs.
 * Import this file directly (*.constants.ts) — no barrel required.
 */

export const MENU_CONTEXT_TYPES = {
    default:            "default",

    // Workspace tree
    folder:             "folder",
    note:               "note",
    file:               "file",
    workspaceSelector:  "workspace-selector",
    workspaceGrid:      "workspace-grid",

    // Note
    noteGrid:           "note-grid",
    richtextEditor:     "richtext-editor",

    // Project / Task
    projectGrid:        "project-grid",
    taskGrid:           "task-grid",
    taskFlow:           "task-flow",

    // LifeLog
    lifelogLog:         "lifelog-log",
    lifelogTrack:       "lifelog-track",

    // Knowledge (K)
    kNode:              "k-node",
    kNodePanelCard:     "k-node-panel-card",
    kKnowledgeSelector: "k-knowledge-selector",
    kTestFlow:          "k-test-flow",
    kNodePanelBlank:    "k-node-panel-blank",

    // Wiki
    wikiGraphNode:      "wiki-graph-node",

    // Shell
    tab:                "tab",
} as const;

export type MenuContextId = typeof MENU_CONTEXT_TYPES[keyof typeof MENU_CONTEXT_TYPES];
