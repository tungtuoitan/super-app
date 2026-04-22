import { useEffect } from "react";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskCommentHelper } from "../hooks/useTaskComment.helper";
import { useTaskCommentStore } from "../store/useTaskComment.store";

export function useTaskCommentHeadless() {
    const { selectedTask } = useTaskDetailSelector();
    const { loadComments } = useTaskCommentHelper();
    const { setComments, setDraftContent, setReplyingTo, setEditingCommentId } = useTaskCommentStore();

    useEffect(() => {
        if (!selectedTask || selectedTask.id <= 0) {
            setComments([]);
            return;
        }
        loadComments(selectedTask.id);
    }, [selectedTask?.id]);

    useEffect(() => {
        setDraftContent("");
        setReplyingTo(null);
        setEditingCommentId(null);
    }, [selectedTask?.id]);
}
