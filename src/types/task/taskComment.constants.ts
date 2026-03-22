import type { CommentFilterType } from "@/types/task/taskComment.types";

export const COMMENT_FILTERS: Array<{ key: CommentFilterType; label: string }> = [
    { key: "all", label: "All" },
    { key: "comment", label: "Comments" },
    { key: "process", label: "Process" },
    { key: "checklist", label: "Checklist" },
    { key: "desc", label: "Description" },
    { key: "custom", label: "Custom tabs" },
];
