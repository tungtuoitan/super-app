import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Reply, Edit2, Trash2, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/shared/components";
import { useTaskCommentStore } from "@/store/task/useTaskComment.store";
import { useTaskCommentSelector } from "@/Selectors/task/TaskCommentSelector";
import { useTaskCommentHelper } from "@/hooks/task/useTaskComment.helper";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { TaskCommentHeadless } from "@/HeadlessComponents/task/TaskCommentHeadless";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useConfirmationPopoverHelper } from "@/hooks/useConfirmationPopover.helper";
import type { TaskComment as TaskCommentType } from "@/types/task/taskComment.types";
import { parseVersionComment, CollapsibleContent, VersionCommentCard, formatTimeAgo, formatFullDate } from "./small/VersionCommentCard";
import { ReplyInput } from "./small/ReplyInput";
import type { CommentFilterType } from "./small/CommentFilterDropdown";

// ─── Filter helper ───────────────────────────────────────────────────────────

function matchesFilter(comment: TaskCommentType, filter: CommentFilterType): boolean {
    if (filter === "all") return true;
    const vp = parseVersionComment(comment.content);
    if (filter === "comment") return !vp; // normal comment
    if (!vp) return false; // remaining filters are for version comments only
    if (filter === "custom") return vp.section.startsWith("custom:");
    return vp.section === filter; // "process" | "checklist" | "desc"
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export function TaskComment({ focusTrigger, filter = "all", showDetail = false }: {
    focusTrigger?: number; filter?: CommentFilterType; showDetail?: boolean;
}) {
    return (
        <>
            <TaskCommentHeadless />
            <TaskCommentInner focusTrigger={focusTrigger} filter={filter} showDetail={showDetail} />
        </>
    );
}

function TaskCommentInner({ focusTrigger, filter, showDetail }: {
    focusTrigger?: number; filter: CommentFilterType; showDetail: boolean;
}) {
    const { threadedComments } = useTaskCommentSelector();
    const { isLoadingComments, replyingTo, editingCommentId, draftContent, setDraftContent } =
        useTaskCommentStore();
    const {
        submitComment,
        updateComment,
        deleteComment,
        startReply,
        startEdit,
        cancelReplyOrEdit,
    } = useTaskCommentHelper();
    const { selectedTask, isDisabled } = useTaskDetailSelector();

    const [newComment, setNewComment] = useState("");

    // Scroll refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    /** Ease-out cubic for smooth deceleration */
    const easedScrollTo = useCallback((container: HTMLElement, targetTop: number, duration = 400) => {
        const start = container.scrollTop;
        const distance = targetTop - start;
        if (Math.abs(distance) < 2) return;
        let startTime: number | null = null;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const t = Math.min((timestamp - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
            container.scrollTop = start + distance * ease;
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, []);

    const scrollToBottom = useCallback((duration = 400) => {
        requestAnimationFrame(() => {
            const container = scrollRef.current;
            if (!container) return;
            easedScrollTo(container, container.scrollHeight, duration);
        });
    }, [easedScrollTo]);

    // Scroll to bottom when switching to comment tab (fast but smooth)
    useEffect(() => {
        if (focusTrigger && focusTrigger > 0) {
            setTimeout(() => scrollToBottom(300), 50);
        }
    }, [focusTrigger, scrollToBottom]);

    // Scroll to bottom when comments finish loading
    const prevLoadingRef = useRef(isLoadingComments);
    useEffect(() => {
        if (prevLoadingRef.current && !isLoadingComments) {
            scrollToBottom(300);
        }
        prevLoadingRef.current = isLoadingComments;
    }, [isLoadingComments, scrollToBottom]);

    const isNewTask = !selectedTask || selectedTask.id <= 0;

    if (isNewTask) {
        return (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Save the task first to add comments.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="space-y-3">
                    {isLoadingComments && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading comments...
                        </div>
                    )}

                    {!isLoadingComments && threadedComments.length === 0 && (
                        <div className="text-xs text-muted-foreground py-4 text-center">
                            No comments yet. Share your thoughts, lessons, or notes.
                        </div>
                    )}

                    {threadedComments
                        .filter((c) => matchesFilter(c, filter))
                        .map((comment) => (
                        <CommentThread
                            key={comment.id}
                            comment={comment}
                            replyingTo={replyingTo}
                            editingCommentId={editingCommentId}
                            draftContent={draftContent}
                            setDraftContent={setDraftContent}
                            onReply={startReply}
                            onEdit={startEdit}
                            onDelete={deleteComment}
                            onSubmitReply={(content) => submitComment(content, comment.id)}
                            onUpdateComment={updateComment}
                            onCancel={cancelReplyOrEdit}
                            isDisabled={isDisabled}
                            scrollContainer={scrollRef.current}
                            showDetail={showDetail}
                        />
                    ))}

                    {/* ── New Comment Input (inside scroll) ── */}
                    {!isDisabled && (
                        <div className="border-t border-border pt-3 mt-1">
                            <div className="space-y-2">
                                <div
                                    className="border rounded-md overflow-hidden"
                                    onKeyDown={(e) => {
                                        if (e.ctrlKey && e.key === "Enter") {
                                            e.preventDefault();
                                            if (newComment.trim() && newComment !== "<p></p>") {
                                                submitComment(newComment);
                                                setNewComment("");
                                                setTimeout(() => scrollToBottom(400), 150);
                                            }
                                        }
                                    }}
                                >
                                    <RichTextEditor
                                        value={newComment}
                                        onChange={setNewComment}
                                        placeholder="Add a comment... (Ctrl+Enter to submit)"
                                        minHeight="96px"
                                        className="text-left"
                                        focusTrigger={focusTrigger}
                                        uploadContext="project"
                                        uploadContextId={selectedTask?.projectId}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">Ctrl+Enter to submit</span>
                                    <button
                                        onClick={() => {
                                            if (newComment.trim() && newComment !== "<p></p>") {
                                                submitComment(newComment);
                                                setNewComment("");
                                                setTimeout(() => scrollToBottom(400), 150);
                                            }
                                        }}
                                        disabled={!newComment.trim() || newComment === "<p></p>"}
                                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
                                        title="Submit comment"
                                    >
                                        <Send className="h-3 w-3" /> Send
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scroll anchor */}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}

/* ── Comment Thread ── */
function CommentThread({ comment, replyingTo, editingCommentId, draftContent, setDraftContent,
    onReply, onEdit, onDelete, onSubmitReply, onUpdateComment, onCancel, isDisabled, scrollContainer, showDetail,
}: {
    comment: TaskCommentType; replyingTo: number | null; editingCommentId: number | null;
    draftContent: string; setDraftContent: (v: string) => void;
    onReply: (id: number) => void; onEdit: (id: number, content: string) => void; onDelete: (id: number) => void;
    onSubmitReply: (content: string) => void; onUpdateComment: (id: number, content: string) => void;
    onCancel: () => void; isDisabled: boolean; scrollContainer: HTMLDivElement | null; showDetail: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <CommentItem
                comment={comment}
                isEditing={editingCommentId === comment.id}
                draftContent={draftContent}
                setDraftContent={setDraftContent}
                onReply={() => onReply(comment.id)}
                onEdit={() => onEdit(comment.id, comment.content)}
                onDelete={onDelete}
                onUpdate={(content) => onUpdateComment(comment.id, content)}
                onCancel={onCancel}
                isDisabled={isDisabled}
                scrollContainer={scrollContainer}
                showDetail={showDetail}
            />

            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-5 border-l-2 border-border pl-3 space-y-1.5">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            isEditing={editingCommentId === reply.id}
                            draftContent={draftContent}
                            setDraftContent={setDraftContent}
                            onEdit={() => onEdit(reply.id, reply.content)}
                            onDelete={onDelete}
                            onUpdate={(content) => onUpdateComment(reply.id, content)}
                            onCancel={onCancel}
                            isDisabled={isDisabled}
                            isReply
                            scrollContainer={scrollContainer}
                            showDetail={showDetail}
                        />
                    ))}
                </div>
            )}

            {replyingTo === comment.id && (
                <div className="ml-5 pl-3">
                    <ReplyInput onSubmit={onSubmitReply} onCancel={onCancel} />
                </div>
            )}
        </div>
    );
}

/* ── Single Comment Item ── */
function CommentItem({ comment, isEditing, draftContent, setDraftContent,
    onReply, onEdit, onDelete, onUpdate, onCancel, isDisabled, isReply, scrollContainer, showDetail,
}: {
    comment: TaskCommentType; isEditing: boolean; draftContent: string; setDraftContent: (v: string) => void;
    onReply?: () => void; onEdit: () => void; onDelete: (id: number) => void; onUpdate: (content: string) => void;
    onCancel: () => void; isDisabled: boolean; isReply?: boolean; scrollContainer: HTMLDivElement | null; showDetail: boolean;
}) {
    const { $user } = useAuthStore();
    const { showConfirmation } = useConfirmationPopoverHelper();
    const timeAgo = formatTimeAgo(comment.createdAt);
    const wasEdited = comment.updatedAt && comment.updatedAt > comment.createdAt;
    const displayName = $user.firstName && $user.lastName
        ? `${$user.firstName} ${$user.lastName}`
        : $user.userName || "User";

    const versionPayload = parseVersionComment(comment.content);

    if (isEditing) {
        return (
            <div className="rounded border border-primary/30 bg-muted/20 p-2 space-y-2">
                <div className="border rounded-md overflow-hidden">
                    <RichTextEditor
                        value={draftContent}
                        onChange={setDraftContent}
                        placeholder="Edit your comment..."
                        minHeight="96px"
                        className="text-left"
                        autoFocus
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => onUpdate(draftContent)}
                        disabled={!draftContent.trim() || draftContent === "<p></p>"}
                        className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                    >
                        Save
                    </button>
                    <button onClick={onCancel} className="text-xs px-2 py-1 rounded hover:bg-muted text-muted-foreground">
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    // Version/system comments: no delete button, hover diff on title
    if (versionPayload) {
        return (
            <VersionCommentCard
                payload={versionPayload}
                timeAgo={timeAgo}
                createdAt={comment.createdAt}
                scrollContainer={scrollContainer}
                defaultExpanded={showDetail}
            />
        );
    }

    const handleDeleteWithConfirmation = (e: React.MouseEvent) => {
        showConfirmation({
            title: "Delete comment?",
            subtitle: "This comment will be permanently deleted.",
            confirmText: "Delete",
            cancelText: "Cancel",
            confirmColor: "destructive",
            cancelColor: "outline",
            anchorEl: e.currentTarget as HTMLElement,
            onConfirm: () => onDelete(comment.id),
        });
    };

    return (
        <div className="group rounded px-2 py-1.5 hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-2">
                {$user.picture ? (
                    <img src={$user.picture} alt={displayName} className="h-6 w-6 rounded-full shrink-0 mt-0.5" />
                ) : (
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium truncate">{displayName}</span>
                        <span className="text-[10px] text-muted-foreground cursor-default" title={formatFullDate(comment.createdAt)}>
                            {timeAgo}
                        </span>
                        {wasEdited && <span className="text-[10px] text-muted-foreground/60 italic">(edited)</span>}
                    </div>
                    <CollapsibleContent>
                        <div className="mt-0.5">
                            <RichTextEditor value={comment.content} onChange={() => {}} disabled minHeight="auto" className="text-left comment-readonly" />
                        </div>
                    </CollapsibleContent>
                </div>

                {!isDisabled && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                        {onReply && !isReply && (
                            <button onClick={onReply} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Reply">
                                <Reply className="h-3 w-3" />
                            </button>
                        )}
                        <button onClick={onEdit} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                            <Edit2 className="h-3 w-3" />
                        </button>
                        <button onClick={handleDeleteWithConfirmation} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
