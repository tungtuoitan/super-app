import { useMemo } from "react";
import { Send, Reply, Edit2, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/shared";
import { useTaskCommentSelector } from "../../Selectors/TaskCommentSelector";
import { useTaskCommentStore } from "../../store/useTaskComment.store";
import { useTaskCommentHelper } from "../../hooks/taskComment/useTaskComment.helper";
import { useTaskSectionStore } from "../../store/useTaskSection.store";
import { useAuthStore } from "@/shell";
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
                        onClick={() => updateComment(commentId, draftContent)}
                        disabled={!draftContent.trim() || draftContent === "<p></p>"}
                        className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                    >
                        Save
                    </button>
                    <button
                        onClick={cancelReplyOrEdit}
                        className="text-xs px-2 py-1 rounded hover:bg-muted text-muted-foreground"
                    >
                        Cancel
                    </button>
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
        <div className="group rounded px-2 py-1.5 hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-2">
                {$user.picture ? (
                    <img src={$user.picture} alt={displayName} className="h-5 w-5 rounded-full shrink-0 mt-0.5" />
                ) : (
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium truncate">{displayName}</span>
                        <span
                            className="text-[10px] text-muted-foreground cursor-default"
                            title={formatFullDate(comment.createdAt)}
                        >
                            {timeAgo}
                        </span>
                        {wasEdited && (
                            <span className="text-[10px] text-muted-foreground/60 italic">(edited)</span>
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
                        "opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity",
                    )}>
                        {!isReply && (
                            <button
                                onClick={() => startReply(commentId)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Reply"
                            >
                                <Reply className="h-3 w-3" />
                            </button>
                        )}
                        <button
                            onClick={() => startEdit(commentId, comment.content)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit"
                        >
                            <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                            onClick={handleDeleteWithConfirmation}
                            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
            </div>
        </div>
    );
}
