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
