/**
 * Task Comment Headless
 * Side effects: load comments when selected task changes.
 */

import { useEffect } from "react";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { useTaskCommentHelper } from "@/hooks/task/useTaskComment.helper";
import { useTaskCommentStore } from "@/store/task/useTaskComment.store";

export function TaskCommentHeadless() {
    const { selectedTask } = useTaskDetailSelector();
    const { loadComments } = useTaskCommentHelper();
    const { setComments, setDraftContent, setReplyingTo, setEditingCommentId } = useTaskCommentStore();

    // Load comments when task changes
    useEffect(() => {
        if (!selectedTask || selectedTask.id <= 0) {
            setComments([]);
            return;
        }
        loadComments(selectedTask.id);
    }, [selectedTask?.id]);

    // Reset draft state when task changes
    useEffect(() => {
        setDraftContent("");
        setReplyingTo(null);
        setEditingCommentId(null);
    }, [selectedTask?.id]);

    return null;
}
