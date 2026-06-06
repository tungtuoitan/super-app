/**
 * Shell-level Constants
 * Navigation, tab types, module definitions, view types
 */


export const shellConstants = {
    appName: "SuperApp" as const,

    /** localStorage keys owned by the shell */
    storage: {
        tabPinnedState: "tabPinnedState",
    } as const,

    navigation: {
        path: {
            home: "/",
            workspace: "/workspace",
            k: "/k",
            ws: "/ws",
            notes: "/notes",
            project: "/project",
            lifeLog: "/lifelog",
        } as const,
        views: {
            workspace: "workspace",
            k: "k",
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
                kKnowledge: "k-knowledge",
                kNode: "k-node",
                kDailyReview: "k-daily-review",
                wikiInfo: "wiki-info",
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
            wiki: "wiki",
        } as const,
        tabTitles: {
            unsavedNote: "Unsaved Note",
            unsavedWorkspace: "Unsaved Workspace",
            unsavedProject: "Unsaved Project",
            unsavedTask: "Unsaved Task",
            unknownTab: "Unknown Tab",
        } as const,
    },
} as const;
