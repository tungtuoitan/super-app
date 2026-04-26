/**
 * Task Comment Store
 * State for the comment section: comments list, loading, draft, reply/edit mode.
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState } from "react";
import type { TaskComment } from "../types/taskComment.types";

export interface TaskCommentContextData {
    comments: TaskComment[];
    setComments: Dispatch<SetStateAction<TaskComment[]>>;
    isLoadingComments: boolean;
    setIsLoadingComments: Dispatch<SetStateAction<boolean>>;
    replyingTo: number | null;
    setReplyingTo: Dispatch<SetStateAction<number | null>>;
    editingCommentId: number | null;
    setEditingCommentId: Dispatch<SetStateAction<number | null>>;
    draftContent: string;
    setDraftContent: Dispatch<SetStateAction<string>>;
}

export const taskCommentContextDefaultValue: TaskCommentContextData = {
    comments: [],
    setComments: () => {},
    isLoadingComments: false,
    setIsLoadingComments: () => {},
    replyingTo: null,
    setReplyingTo: () => {},
    editingCommentId: null,
    setEditingCommentId: () => {},
    draftContent: "",
    setDraftContent: () => {},
};

export const TaskCommentStore = createContext<TaskCommentContextData>(taskCommentContextDefaultValue);

export const useTaskCommentStore = () => useContext(TaskCommentStore);

export const TaskCommentProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [draftContent, setDraftContent] = useState("");

    return (
        <TaskCommentStore.Provider
            value={{
                comments, setComments,
                isLoadingComments, setIsLoadingComments,
                replyingTo, setReplyingTo,
                editingCommentId, setEditingCommentId,
                draftContent, setDraftContent,
            }}
        >
            {children}
        </TaskCommentStore.Provider>
    );
};
