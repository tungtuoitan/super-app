/**
 * Task Comment Selector
 * Derived values: threaded comments (flat → tree), comment count.
 */

import { useMemo } from "react";
import { useTaskCommentStore } from "@/store/task/useTaskComment.store";
import type { TaskComment } from "@/types/task/taskComment.types";

export const useTaskCommentSelector = () => {
    const { comments } = useTaskCommentStore();

    /** Build threaded tree: top-level comments with nested replies (1 level) */
    const threadedComments = useMemo(() => {
        const topLevel: TaskComment[] = [];
        const replyMap = new Map<number, TaskComment[]>();

        for (const c of comments) {
            if (c.parentCommentId) {
                const list = replyMap.get(c.parentCommentId) ?? [];
                list.push(c);
                replyMap.set(c.parentCommentId, list);
            } else {
                topLevel.push(c);
            }
        }

        return topLevel.map((c) => ({
            ...c,
            replies: replyMap.get(c.id) ?? [],
        }));
    }, [comments]);

    const commentCount = useMemo(() => comments.length, [comments]);

    return { threadedComments, commentCount };
};
