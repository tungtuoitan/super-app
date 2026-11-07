export const TYPE_ORDER = ["workspace", "folder", "note", "file", "project", "task", "log", "track", "external"];
/** Fallback sort index for types not in TYPE_ORDER — sorts them after all known types. */
export const UNKNOWN_TYPE_SORT_ORDER = TYPE_ORDER.length + 1;

/** Seconds between auto-refreshes of the repo-vs-DB diff while the dialog is open. */
export const REFRESH_INTERVAL_SEC = 10;
