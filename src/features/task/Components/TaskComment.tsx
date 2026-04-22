import { useState, useEffect, useCallback, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { RichTextEditor } from "@/shared/components";
import { useTaskCommentSelector } from "../Selectors/TaskCommentSelector";
import { TaskCommentProvider, useTaskCommentStore } from "../store/useTaskComment.store";
import { useTaskCommentHelper } from "../hooks/useTaskComment.helper";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskSectionStore } from "../store/useTaskSection.store";
import { useTaskCommentHeadless } from "../HeadlessComponents/useTaskComment.headless";
import { matchesFilter } from "../utils/taskComment.utils";
import { CommentThread } from "./small/CommentThread";
import { NewTaskPlaceholder } from "./small/NewTaskPlaceholder";

export function TaskComment() {
    return (
        <TaskCommentProvider>
            <TaskCommentInner />
        </TaskCommentProvider>
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

    const easedScrollTo = useCallback((container: HTMLElement, targetTop: number, duration = 400) => {
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
    }, []);

    const scrollToBottom = useCallback((duration = 400) => {
        requestAnimationFrame(() => {
            const container = scrollContainerRef.current;
            if (!container) return;
            easedScrollTo(container, container.scrollHeight, duration);
        });
    }, [easedScrollTo, scrollContainerRef]);

    useEffect(() => {
        if (commentFocusTrigger > 0) setTimeout(() => scrollToBottom(300), 50);
    }, [commentFocusTrigger, scrollToBottom]);

    useEffect(() => {
        if (prevLoadingRef.current && !isLoadingComments) scrollToBottom(300);
        prevLoadingRef.current = isLoadingComments;
    }, [isLoadingComments, scrollToBottom]);

    const isNewTask = !selectedTask || selectedTask.id <= 0;
    if (isNewTask) return <NewTaskPlaceholder />;

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
                <div className="space-y-3">
                    {isLoadingComments && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading comments...
                        </div>
                    )}
                    {!isLoadingComments && filteredComments.length === 0 && (
                        <div className="text-xs text-muted-foreground py-4 text-center">
                            No comments yet. Share your thoughts, lessons, or notes.
                        </div>
                    )}
                    {filteredComments.map((comment) => (
                        <CommentThread key={comment.id} commentId={comment.id} />
                    ))}

                    <div className="border-t border-border pt-3 mt-1">
                        <div className="space-y-2">
                            <div className="border rounded-md overflow-hidden">
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
                                <span className="text-[10px] text-muted-foreground">Enter to submit</span>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!newComment.trim() || newComment === "<p></p>"}
                                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
                                >
                                    <Send className="h-3 w-3" /> Send
                                </button>
                            </div>
                        </div>
                    </div>
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}
