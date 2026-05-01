

// Storage keys constants
export const STORAGE_KEYS = {
    USER_PROFILE: "userProfile",
    MODULE_NAME: "moduleName",
    K_TREE_MARK: "k_tree_mark", // suffixed per workspace: k_tree_mark_{workspaceId}
    COMMENT_FILTER: "commentFilter",
    COMMENT_SHOW_DETAIL: "commentShowDetail",
    TASK_FLOW_VIEWPORT: "taskFlowViewport", // { x, y, zoom } for MultiProject Task Flow tab
} as const;
