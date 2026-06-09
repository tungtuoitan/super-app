export type KSyncStatus =
    | "idle"
    | "synced"
    | "checking"
    | "pushing"
    | "pulling"
    | "behind"
    | "conflict"
    | "error";

export interface KRepoSyncConfig {
    repoUrl: string;
    branch: string;
    lastPushAt: string | null;
    lastCheckAt: string | null;
    statusCode: KSyncStatus;
    /** Human-readable message, e.g. "Pushing DB → repo..." or "Conflict detected" */
    statusMessage: string | null;
}

export interface KRepoSyncDiffItem {
    nodeId: number;
    nodeName: string;
    /** null = new question (no existing DB id yet) */
    questionId: number | null;
    oldText: string | null;
    newText: string | null;
    changeType: "added" | "modified" | "removed";
}

export interface KRepoSyncDiff {
    items: KRepoSyncDiffItem[];
}

export interface KSyncStatusMessage {
    status: KSyncStatus;
    message: string | null;
    direction: "push" | "pull" | "";
}

export interface KRepoCompareEntry {
    /** "knowledge" | "node" | "question" */
    entityType: "knowledge" | "node" | "question";
    /** "repo_only" | "db_only" | "modified" */
    changeType: "repo_only" | "db_only" | "modified";
    dbId: number | null;
    name: string;
    knowledgeName: string | null;
    nodeName: string | null;
    repoPath: string | null;
    /** DB text / old name */
    oldText: string | null;
    /** Repo text / new name */
    newText: string | null;
}

export interface KRepoCompareDiff {
    entries: KRepoCompareEntry[];
    repoOnlyCount: number;
    dbOnlyCount: number;
    modifiedCount: number;
    error: string | null;
}

export interface KRepoResolveConflictItem {
    entityType: "knowledge" | "node" | "question";
    dbId: number;
    /** "keep_db" — DB wins (no DB change). "keep_repo" — overwrite DB with repo. */
    action: "keep_db" | "keep_repo";
}
