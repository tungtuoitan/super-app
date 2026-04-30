/**
 * Task Comment Helper
 * Handles comment CRUD operations, reply, edit mode.
 */

import { useAuthStore } from "@/shared";
import { useTaskCommentStore } from "../../store/useTaskComment.store";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { taskCommentService } from "../../service/taskComment.service";
import { parseAsLocalDate } from "@/shared";
import type { TaskComment, TaskCommentDTO } from "../../types/taskComment.types";

/** Transform DTO (string dates) → domain model (Date objects) */
const transformComment = (dto: TaskCommentDTO): TaskComment => ({
    id: dto.id,
    taskId: dto.taskId,
    parentCommentId: dto.parentCommentId,
    content: dto.content,
    userId: dto.userId,
    createdAt: parseAsLocalDate(dto.createdAt) || new Date(),
    updatedAt: parseAsLocalDate(dto.updatedAt),
    deletedAt: parseAsLocalDate(dto.deletedAt),
});

export const useTaskCommentHelper = () => {
    const { $user } = useAuthStore();
    const { selectedTask } = useTaskDetailSelector();
    const {
        setComments,
        setIsLoadingComments,
        setReplyingTo,
        setEditingCommentId,
        setDraftContent,
    } = useTaskCommentStore();

    /** Load all comments for the current task */
    const loadComments = async (taskId?: number) => {
            const id = taskId ?? selectedTask?.id;
            if (!id || id <= 0 || !$user.userToken) return;

            setIsLoadingComments(true);
            try {
                const result = await taskCommentService._getCommentsByTaskId($user.userToken, id);
                if (result.success && result.data) {
                    setComments((result.data as unknown as TaskCommentDTO[]).map(transformComment));
                }
            } catch (err) {
                console.error("Failed to load comments:", err);
            } finally {
                setIsLoadingComments(false);
            }
        };

    /** Submit a new comment or reply */
    const submitComment = async (content: string, parentCommentId?: number | null) => {
            if (!selectedTask || selectedTask.id <= 0 || !$user.userToken) return;
            if (!content.trim()) return;

            try {
                const result = await taskCommentService._upsertComment($user.userToken, {
                    id: 0,
                    taskId: selectedTask.id,
                    parentCommentId: parentCommentId ?? null,
                    content,
                });

                if (result.success && result.data) {
                    const newComments = (result.data as unknown as TaskCommentDTO[]).map(transformComment);
                    setComments((prev) => [...prev, ...newComments]);
                    setDraftContent("");
                    setReplyingTo(null);
                }
            } catch (err) {
                console.error("Failed to submit comment:", err);
            }
        };

    /** Update an existing comment's content */
    const updateComment = async (commentId: number, content: string) => {
            if (!selectedTask || !$user.userToken) return;
            if (!content.trim()) return;

            try {
                const result = await taskCommentService._upsertComment($user.userToken, {
                    id: commentId,
                    taskId: selectedTask.id,
                    content,
                });

                if (result.success) {
                    setComments((prev) =>
                        prev.map((c) =>
                            c.id === commentId
                                ? { ...c, content, updatedAt: new Date() }
                                : c,
                        ),
                    );
                    setEditingCommentId(null);
                }
            } catch (err) {
                console.error("Failed to update comment:", err);
            }
        };

    /** Soft delete a comment */
    const deleteComment = async (commentId: number) => {
            if (!$user.userToken) return;

            try {
                const result = await taskCommentService._deleteComment($user.userToken, commentId);
                if (result.success) {
                    // Remove comment + its replies from local state
                    setComments((prev) =>
                        prev.filter((c) => c.id !== commentId && c.parentCommentId !== commentId),
                    );
                }
            } catch (err) {
                console.error("Failed to delete comment:", err);
            }
        };

    /** Start replying to a comment */
    const startReply = (commentId: number) => {
            setReplyingTo(commentId);
            setEditingCommentId(null);
        };

    /** Start editing a comment */
    const startEdit = (commentId: number, currentContent: string) => {
            setEditingCommentId(commentId);
            setDraftContent(currentContent);
            setReplyingTo(null);
        };

    /** Cancel reply or edit */
    const cancelReplyOrEdit = () => {
        setReplyingTo(null);
        setEditingCommentId(null);
        setDraftContent("");
    };

    /**
     * Auto-create a version comment when process/checklist/desc structure changes.
     * Fire-and-forget: does NOT block the save flow.
     * @param section - "process" | "checklist" | "desc"
     * @param oldText - text representation of old version
     * @param newText - text representation of new version
     */
    const submitVersionComment = (section: "process" | "checklist" | "desc", oldText: string, newText: string) => {
            if (!selectedTask || selectedTask.id <= 0 || !$user.userToken) return;
            // Skip if no meaningful change
            if (oldText.trim() === newText.trim()) return;

            const content = JSON.stringify({ type: "version", section, oldText, newText });
            taskCommentService._upsertComment($user.userToken, {
                id: 0,
                taskId: selectedTask.id,
                parentCommentId: null,
                content,
            }).then((result) => {
                if (result.success && result.data) {
                    const newComments = (result.data as unknown as TaskCommentDTO[]).map(transformComment);
                    setComments((prev) => [...prev, ...newComments]);
                }
            }).catch((err) => {
                console.error("Failed to create version comment:", err);
            });
        };

    return {
        loadComments,
        submitComment,
        updateComment,
        deleteComment,
        startReply,
        startEdit,
        cancelReplyOrEdit,
        submitVersionComment,
    };
};
