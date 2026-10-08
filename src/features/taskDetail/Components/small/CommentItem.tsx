import { useMemo } from "react";
import { Send, Reply, Edit2, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextEditor, ShadcnButton } from "@/shared";
import { useTaskCommentSelector } from "../../Selectors/TaskCommentSelector";
import { useTaskCommentStore } from "../../store/useTaskComment.store";
import { useTaskCommentHelper } from "../../hooks/taskComment/useTaskComment.helper";
import { useTaskSectionStore } from "../../store/useTaskSection.store";
import { useAuthStore } from "@/shared";
import { useConfirmationPopoverHelper } from "@/shared";
import { parseVersionComment, formatTimeAgo, formatFullDate } from "../../utils/versionComment.utils";
import { CollapsibleContent } from "./CollapsibleContent";
import { VersionCommentCard } from "./VersionCommentCard";

/** Single comment bubble — accepts only commentId (loop-rendered component). */
export function CommentItem({ commentId, isReply }: { commentId: number; isReply?: boolean }) {
    const { commentsById } = useTaskCommentSelector();
    const { editingCommentId, draftContent, setDraftContent } = useTaskCommentStore();
    const { updateComment, deleteComment, cancelReplyOrEdit, startEdit, startReply } = useTaskCommentHelper();
    const { commentShowDetail, scrollContainerRef } = useTaskSectionStore();
    const { $user } = useAuthStore();
    const { showConfirmation } = useConfirmationPopoverHelper();

    const comment = commentsById.get(commentId);

    // ── All hooks before early return (R7) ──────────────────────────────────
    const timeAgo = comment ? formatTimeAgo(comment.createdAt) : ""
    const wasEdited = !!(comment?.updatedAt && comment.updatedAt > comment.createdAt)
    const versionPayload = comment ? parseVersionComment(comment.content) : null
    const displayName = (() => {
        if ($user.firstName && $user.lastName) return `${$user.firstName} ${$user.lastName}`;
        return $user.userName || "User";
    })()

    if (!comment) return null;

    const isEditing = editingCommentId === commentId;

    // ── Editing mode ────────────────────────────────────────────────────────
    if (isEditing) {
        return (
            <div className="space-y-2 rounded-xl border border-sa-border-strong bg-card p-2">
                <div className="overflow-hidden rounded-lg border border-sa-border">
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
                    <ShadcnButton
                        size="sm"
                        onClick={() => updateComment(commentId, draftContent)}
                        disabled={!draftContent.trim() || draftContent === "<p></p>"}
                    >
                        Save
                    </ShadcnButton>
                    <ShadcnButton size="sm" variant="ghost" onClick={cancelReplyOrEdit} className="text-muted-foreground">
                        Cancel
                    </ShadcnButton>
                </div>
            </div>
        );
    }

    // ── Version/system comment ──────────────────────────────────────────────
    if (versionPayload) {
        return (
            <VersionCommentCard
                payload={versionPayload}
                timeAgo={timeAgo}
                createdAt={comment.createdAt}
                scrollContainer={scrollContainerRef.current}
                defaultExpanded={commentShowDetail}
            />
        );
    }

    // ── Normal comment ──────────────────────────────────────────────────────
    const handleDeleteWithConfirmation = (e: React.MouseEvent) => {
        showConfirmation({
            title: "Delete comment?",
            subtitle: "This comment will be permanently deleted.",
            confirmText: "Delete",
            cancelText: "Cancel",
            confirmColor: "destructive",
            cancelColor: "outline",
            anchorEl: e.currentTarget as HTMLElement,
            onConfirm: () => deleteComment(commentId),
        });
    };

    return (
        <div className="group rounded-lg px-2 py-1.5 transition-colors duration-100 hover:bg-sa-hover">
            <div className="flex items-start gap-2">
                {$user.picture ? (
                    <img src={$user.picture} alt={displayName} className="h-5 w-5 rounded-full shrink-0 mt-0.5" />
                ) : (
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sa-surface-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-medium text-foreground">{displayName}</span>
                        <span
                            className="cursor-default text-[11px] text-muted-foreground"
                            title={formatFullDate(comment.createdAt)}
                        >
                            {timeAgo}
                        </span>
                        {wasEdited && (
                            <span className="text-[11px] text-muted-foreground/70">(edited)</span>
                        )}
                    </div>
                    <CollapsibleContent>
                        <div className="mt-0.5">
                            <RichTextEditor
                                value={comment.content}
                                onChange={() => {}}
                                disabled
                                minHeight="auto"
                                className="text-left comment-readonly"
                            />
                        </div>
                    </CollapsibleContent>
                </div>
                <div className={cn(
                        "flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100",
                    )}>
                        {!isReply && (
                            <button
                                onClick={() => startReply(commentId)}
                                className="rounded-md p-1 text-muted-foreground transition-colors duration-100 hover:bg-sa-hover-strong hover:text-foreground"
                                title="Reply"
                            >
                                <Reply className="h-3 w-3" />
                            </button>
                        )}
                        <button
                            onClick={() => startEdit(commentId, comment.content)}
                            className="rounded-md p-1 text-muted-foreground transition-colors duration-100 hover:bg-sa-hover-strong hover:text-foreground"
                            title="Edit"
                        >
                            <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                            onClick={handleDeleteWithConfirmation}
                            className="rounded-md p-1 text-muted-foreground transition-colors duration-100 hover:bg-sa-danger/10 hover:text-sa-danger"
                            title="Delete"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
            </div>
        </div>
    );
}
