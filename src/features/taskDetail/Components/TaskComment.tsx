import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { RichTextEditor, ShadcnButton } from "@/shared";
import { useTaskCommentSelector } from "../Selectors/TaskCommentSelector";
import { TaskCommentProvider, useTaskCommentStore } from "../store/useTaskComment.store";
import { useTaskCommentHelper } from "../hooks/taskComment/useTaskComment.helper";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskSectionStore } from "../store/useTaskSection.store";
import { useTaskCommentHeadless } from "../hooks/taskComment/useTaskComment.headless";
import { matchesFilter } from "../utils/taskComment.utils";
import { CommentThread } from "./small/CommentThread";

export function TaskComment() {
    return (
            <TaskCommentInner />
    );
}

function TaskCommentInner() {
    useTaskCommentHeadless();
    const { threadedComments } = useTaskCommentSelector();
    const { isLoadingComments } = useTaskCommentStore();
    const { submitComment } = useTaskCommentHelper();
    const { selectedTask } = useTaskDetailSelector();
    const { commentFilter, commentFocusTrigger, scrollContainerRef } = useTaskSectionStore();

    const [newComment, setNewComment] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);
    const prevLoadingRef = useRef(isLoadingComments);

    const easedScrollTo = (container: HTMLElement, targetTop: number, duration = 400) => {
        const start = container.scrollTop;
        const distance = targetTop - start;
        if (Math.abs(distance) < 2) return;
        let startTime: number | null = null;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const t = Math.min((timestamp - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            container.scrollTop = start + distance * ease;
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    const scrollToBottom = (duration = 400) => {
        requestAnimationFrame(() => {
            const container = scrollContainerRef.current;
            if (!container) return;
            easedScrollTo(container, container.scrollHeight, duration);
        });
    };

    useEffect(() => {
        if (commentFocusTrigger > 0) setTimeout(() => scrollToBottom(300), 50);
    }, [commentFocusTrigger]);

    useEffect(() => {
        if (prevLoadingRef.current && !isLoadingComments) scrollToBottom(300);
        prevLoadingRef.current = isLoadingComments;
    }, [isLoadingComments]);

    const isNewTask = !selectedTask || selectedTask.id <= 0;
    if (isNewTask) return <div className="flex h-[200px] items-center justify-center text-[13px] text-muted-foreground">
            Save the task first (Ctrl+S) to use this section.
        </div>

    const filteredComments = threadedComments.filter((c) => matchesFilter(c, commentFilter));

    const handleSubmit = () => {
        if (!newComment.trim() || newComment === "<p></p>") return;
        submitComment(newComment);
        setNewComment("");
        setTimeout(() => scrollToBottom(400), 150);
    };

    return (
        <div className="flex flex-col h-full">
            <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="space-y-2">
                    {isLoadingComments && (
                        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading comments...
                        </div>
                    )}
                    {!isLoadingComments && filteredComments.length === 0 && (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                            No comments yet. Share your thoughts, lessons, or notes.
                        </div>
                    )}
                    {filteredComments.map((comment) => (
                        <CommentThread key={comment.id} commentId={comment.id} />
                    ))}

                    <div className="mt-1 border-t border-sa-border pt-3">
                        <div className="space-y-2">
                            <div className="overflow-hidden rounded-xl border border-sa-border transition-colors duration-100 focus-within:border-sa-border-strong">
                                <RichTextEditor
                                    value={newComment}
                                    onChange={setNewComment}
                                    placeholder="Add a comment... (Enter to submit, Ctrl+Enter for newline)"
                                    minHeight="96px"
                                    className="text-left"
                                    focusTrigger={commentFocusTrigger}
                                    uploadContext="project"
                                    uploadContextId={selectedTask?.projectId}
                                    onEnter={handleSubmit}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground">Enter to submit</span>
                                <ShadcnButton
                                    size="sm"
                                    onClick={handleSubmit}
                                    disabled={!newComment.trim() || newComment === "<p></p>"}
                                    className="[&_svg]:size-3.5"
                                >
                                    <Send /> Send
                                </ShadcnButton>
                            </div>
                        </div>
                    </div>
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}
