/**
 * Task Comment Selector
 * Derived values: threaded comments, commentsById, repliesByParentId, count.
 */

import { useMemo } from "react";
import { useTaskCommentStore } from "../store/useTaskComment.store";
import type { TaskComment } from "../types/taskComment.types";

export const useTaskCommentSelector = () => {
    const { comments } = useTaskCommentStore();

    /** Flat map of all comments (including replies) keyed by id */
    const commentsById = (() => {
        const map = new Map<number, TaskComment>();
        for (const c of comments) map.set(c.id, c);
        return map;
    })()

    /** Replies keyed by parentCommentId */
    const repliesByParentId = (() => {
        const map = new Map<number, TaskComment[]>();
        for (const c of comments) {
            if (c.parentCommentId) {
                const list = map.get(c.parentCommentId) ?? [];
                list.push(c);
                map.set(c.parentCommentId, list);
            }
        }
        return map;
    })()

    /** Build threaded tree: top-level comments with nested replies (1 level) */
    const threadedComments = (() => {
        const topLevel: TaskComment[] = [];
        for (const c of comments) {
            if (!c.parentCommentId) topLevel.push(c);
        }
        return topLevel.map((c) => ({
            ...c,
            replies: repliesByParentId.get(c.id) ?? [],
        }));
    })()

    const commentCount = comments.length

    return { threadedComments, commentsById, repliesByParentId, commentCount };
};
