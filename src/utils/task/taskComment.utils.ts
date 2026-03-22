import type { TaskComment } from "@/types/task/taskComment.types";
import type { CommentFilterType } from "@/types/task/taskComment.types";
import { parseVersionComment } from "@/utils/task/versionComment.utils";

export function matchesFilter(comment: TaskComment, filter: CommentFilterType): boolean {
    if (filter === "all") return true;
    const vp = parseVersionComment(comment.content);
    if (filter === "comment") return !vp;
    if (!vp) return false;
    if (filter === "custom") return vp.section.startsWith("custom:");
    return vp.section === filter;
}
