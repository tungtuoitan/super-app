

// Storage keys constants
export const STORAGE_KEYS = {
    USER_PROFILE: "userProfile",
    MODULE_NAME: "moduleName",
    K_TREE_MARK: "k_tree_mark",       // suffixed per knowledge: k_tree_mark_{knowledgeId}
    K_TREE_OPEN_IDS: "k_tree_open",   // suffixed per knowledge: k_tree_open_{knowledgeId}
    COMMENT_FILTER: "commentFilter",
    COMMENT_SHOW_DETAIL: "commentShowDetail",
    TASK_FLOW_VIEWPORT: "taskFlowViewport", // { x, y, zoom } for MultiProject Task Flow tab
} as const;
