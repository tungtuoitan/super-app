/**
 * TaskCustomTab — content panel for a user-created custom tab.
 * Format: Name: xxx / Version: xxx / --- / body
 * Parent controls Save/Discard buttons via onDirtyChange callback + imperative ref.
 */

import { useState, useEffect, useMemo, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import { RichTextEditor } from "@/shared/components";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { useTaskDetailFormHelper } from "@/hooks/task/useTaskDetailForm.helper";
import { useTaskCommentHelper } from "@/hooks/task/useTaskComment.helper";
import { useAuthStore } from "@/store/auth/Auth.store";
import { taskService } from "@/services/task.service";
import { Task } from "@/store/task/useTask.store";
import { useEditorTabsStore } from "@/store/index";
import { BaseTab } from "@/types/editor/tab.types";
import {
    parseCustomTabs,
    serializeCustomTabs,
    extractNameVersion,
    validateCustomTabFormat,
    type CustomTab,
} from "@/types/task/customTab.types";

export interface CustomTabHandle {
    save: () => Promise<void>;
    discard: () => void;
}

interface TaskCustomTabProps {
    tabId: string;
    focusTrigger?: number;
    onDirtyChange?: (dirty: boolean) => void;
}

export const TaskCustomTab = forwardRef<CustomTabHandle, TaskCustomTabProps>(
    function TaskCustomTab({ tabId, focusTrigger, onDirtyChange }, ref) {
        const { selectedTask, isDisabled } = useTaskDetailSelector();
        const { handleFieldChange } = useTaskDetailFormHelper();
        const { submitVersionComment } = useTaskCommentHelper();
        const { $user } = useAuthStore();
        const { setOpenTabs, activeTabId } = useEditorTabsStore();

        const customTabs = useMemo(
            () => parseCustomTabs(selectedTask?.customTabsJson),
            [selectedTask?.customTabsJson],
        );

        const tab = useMemo(
            () => customTabs.tabs.find((t) => t.id === tabId),
            [customTabs.tabs, tabId],
        );

        const [editContent, setEditContent] = useState(tab?.content ?? "");
        const [validationError, setValidationError] = useState<string | null>(null);
        const savedContentRef = useRef(tab?.content ?? "");

        useEffect(() => {
            if (tab) {
                setEditContent(tab.content);
                savedContentRef.current = tab.content;
                onDirtyChange?.(false);
                setValidationError(null);
            }
        }, [tab?.id, tab?.updatedAt]);

        const handleContentChange = useCallback((value: string) => {
            setEditContent(value);
            setValidationError(null);
            onDirtyChange?.(value !== savedContentRef.current);
        }, [onDirtyChange]);

        const save = useCallback(async () => {
            if (!tab || !selectedTask) return;

            // Validate format
            const error = validateCustomTabFormat(editContent);
            if (error) {
                setValidationError(error);
                return;
            }

            const oldContent = tab.content;
            const { name: newName, version: newVersion } = extractNameVersion(editContent);
            const now = new Date().toISOString();

            const updatedTab: CustomTab = {
                ...tab, name: newName, version: newVersion, content: editContent, updatedAt: now,
            };
            const newTabs = { tabs: customTabs.tabs.map((t) => (t.id === tabId ? updatedTab : t)) };
            const json = serializeCustomTabs(newTabs);

            if (selectedTask.id <= 0) {
                handleFieldChange("customTabsJson", json);
            } else {
                await taskService._patchTask($user.userToken, selectedTask.id, { customTabsJson: json });
                setOpenTabs((prev: BaseTab[]) =>
                    prev.map((t) => t.id === activeTabId
                        ? { ...t, data: { ...(t.data as Task), customTabsJson: json }, data0: { ...(t.data as Task), customTabsJson: json } }
                        : t),
                );
            }

            if (oldContent !== editContent) {
                submitVersionComment(`custom:${newName}` as any, `[v${tab.version}]\n${oldContent}`, `[v${newVersion}]\n${editContent}`);
            }

            savedContentRef.current = editContent;
            setValidationError(null);
            onDirtyChange?.(false);
        }, [tab, selectedTask, customTabs, tabId, editContent, handleFieldChange, submitVersionComment, $user.userToken, activeTabId, setOpenTabs, onDirtyChange]);

        const discard = useCallback(() => {
            setEditContent(savedContentRef.current);
            setValidationError(null);
            onDirtyChange?.(false);
        }, [onDirtyChange]);

        useImperativeHandle(ref, () => ({ save, discard }), [save, discard]);

        if (!tab) {
            return <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">Tab not found.</div>;
        }

        return (
            <div className="flex flex-col h-full pt-2.5">
                {validationError && (
                    <div className="text-xs text-destructive px-2 py-1 bg-destructive/10 rounded mb-1 shrink-0">
                        {validationError}
                    </div>
                )}
                <div className="flex-1 min-h-0 overflow-y-auto border rounded-md">
                    <RichTextEditor
                        value={editContent}
                        onChange={handleContentChange}
                        placeholder="Name: Tab name&#10;Version: 1&#10;--&#10;Content here..."
                        minHeight="580px"
                        className="text-left"
                        disabled={isDisabled}
                        focusTrigger={focusTrigger}
                        uploadContext="project"
                        uploadContextId={selectedTask?.projectId}
                    />
                </div>
            </div>
        );
    },
);
