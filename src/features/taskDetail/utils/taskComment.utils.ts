import type { TaskComment } from "@/features/taskDetail/types/taskComment.types";
import type { CommentFilterType } from "@/features/taskDetail/types/taskComment.types";
import { parseVersionComment } from "../utils/versionComment.utils";

export function matchesFilter(comment: TaskComment, filter: CommentFilterType): boolean {
    if (filter === "all") return true;
    const vp = parseVersionComment(comment.content);
    if (filter === "comment") return !vp;
    if (!vp) return false;
    if (filter === "custom") return vp.section.startsWith("custom:");
    return vp.section === filter;
}
