import { useEffect } from "react";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskCommentStore } from "../../store/useTaskComment.store";
import { useTaskSectionStore } from "../../store/useTaskSection.store";
import {useTaskCommentHelper} from "./useTaskComment.helper";

export function useTaskCommentHeadless() {
    const { selectedTask } = useTaskDetailSelector();
    const { loadComments } = useTaskCommentHelper();
    const { setComments, setDraftContent, setReplyingTo, setEditingCommentId } = useTaskCommentStore();
    const { commentLoadTrigger } = useTaskSectionStore();

    useEffect(() => {
        if (!selectedTask || selectedTask.id <= 0) {
            setComments([]);
            return;
        }
        loadComments(selectedTask.id);
    }, [selectedTask?.id, commentLoadTrigger]);

    useEffect(() => {
        setDraftContent("");
        setReplyingTo(null);
        setEditingCommentId(null);
    }, [selectedTask?.id]);
}
