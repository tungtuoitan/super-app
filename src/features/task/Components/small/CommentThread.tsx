import { useTaskCommentSelector } from "../../Selectors/TaskCommentSelector";
import { useTaskCommentStore } from "../../store/useTaskComment.store";
import { useTaskCommentHelper } from "../../hooks/useTaskComment.helper";
import { CommentItem } from "./CommentItem";
import { ReplyInput } from "./ReplyInput";

/** Threaded comment — accepts only the top-level commentId (loop-rendered). */
export function CommentThread({ commentId }: { commentId: number }) {
    const { repliesByParentId } = useTaskCommentSelector();
    const { replyingTo } = useTaskCommentStore();
    const { submitComment, cancelReplyOrEdit } = useTaskCommentHelper();

    const replies = repliesByParentId.get(commentId) ?? [];

    return (
        <div className="space-y-1.5">
            <CommentItem commentId={commentId} />

            {replies.length > 0 && (
                <div className="ml-5 border-l-2 border-border pl-3 space-y-1.5">
                    {replies.map((reply) => (
                        <CommentItem key={reply.id} commentId={reply.id} isReply />
                    ))}
                </div>
            )}

            {replyingTo === commentId && (
                <div className="ml-5 pl-3">
                    <ReplyInput
                        onSubmit={(content) => submitComment(content, commentId)}
                        onCancel={cancelReplyOrEdit}
                    />
                </div>
            )}
        </div>
    );
}
