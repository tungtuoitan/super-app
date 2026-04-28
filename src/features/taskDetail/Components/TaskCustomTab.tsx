/**
 * TaskCustomTab — content panel for a user-created custom tab.
 * Format: Name: xxx / Version: xxx / --- / body
 *
 * Reads focus/dirty state from useTaskSectionStore — no props except tabId.
 * Registers save/discard handlers in customTabHandlersRef on mount.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { RichTextEditor } from "@/shared/components";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskDetailFormHelper } from "../hooks/useTaskDetailForm.helper";
import { useTaskCommentHelper } from "../hooks/taskComment/useTaskComment.helper";
import { useAuthStore } from "@/shell/store/Auth.store";
import { useTaskDetailSectionStore } from "../store/useTaskDetailSection.store";
import { useTaskSectionStore } from "../store/useTaskSection.store";
import { taskService } from "../service/task.service";
import { Task } from "../types/task.types";
import { BaseTab } from "@/shell/types/tab.types";
import { type CustomTab } from "../types/customTab.types";
import {
    parseCustomTabs,
    serializeCustomTabs,
    extractNameVersion,
    validateCustomTabFormat,
} from "../utils/customTab.utils";
import {useEditorTabBarStore} from "@/shell/store/EditorTab.store";

/** Loop-rendered: accepts only the tabId identifier. */
export function TaskCustomTab({ tabId }: { tabId: string }) {
    const { selectedTask, isDisabled } = useTaskDetailSelector();
    const { handleFieldChange } = useTaskDetailFormHelper();
    const { submitVersionComment } = useTaskCommentHelper();
    const { $user } = useAuthStore();
    const { setOpenTabs, activeTabId } = useEditorTabBarStore();
    const { activeSection } = useTaskDetailSectionStore();
    const { customFocusTrigger, customTabHandlersRef, setCustomTabDirty } = useTaskSectionStore();

    const customTabs = parseCustomTabs(selectedTask?.customTabsJson)

    const tab = customTabs.tabs.find((t) => t.id === tabId)

    const [editContent, setEditContent] = useState(tab?.content ?? "");
    const [validationError, setValidationError] = useState<string | null>(null);
    const savedContentRef = useRef(tab?.content ?? "");

    const isActiveTab = activeSection === `custom:${tabId}`;

    // ── Reset when the tab content changes externally (e.g. after another save) ──
    useEffect(() => {
        if (tab) {
            setEditContent(tab.content);
            savedContentRef.current = tab.content;
            setValidationError(null);
            if (isActiveTab) setCustomTabDirty(false);
        }
    }, [tab?.id, tab?.updatedAt]);

    // ── Track dirty state for the active tab only ─────────────────────────────
    useEffect(() => {
        if (isActiveTab) setCustomTabDirty(editContent !== savedContentRef.current);
    }, [editContent, isActiveTab]);

    const handleContentChange = (value: string) => {
        setEditContent(value);
        setValidationError(null);
    };

    const save = async () => {
        if (!tab || !selectedTask) return;
        const error = validateCustomTabFormat(editContent);
        if (error) { setValidationError(error); return; }

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
                    : t,
                ),
            );
        }

        if (oldContent !== editContent) {
            submitVersionComment(
                `custom:${newName}` as never,
                `[v${tab.version}]\n${oldContent}`,
                `[v${newVersion}]\n${editContent}`,
            );
        }

        savedContentRef.current = editContent;
        setValidationError(null);
        if (isActiveTab) setCustomTabDirty(false);
    };

    const discard = () => {
        setEditContent(savedContentRef.current);
        setValidationError(null);
        if (isActiveTab) setCustomTabDirty(false);
    };

    // ── Register handlers in store (replaces forwardRef + useImperativeHandle) ──
    useEffect(() => {
        customTabHandlersRef.current[tabId] = { save, discard };
        return () => { delete customTabHandlersRef.current[tabId]; };
    }, [tabId, customTabHandlersRef]);

    if (!tab) {
        return (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Tab not found.
            </div>
        );
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
                    focusTrigger={isActiveTab ? customFocusTrigger : 0}
                    uploadContext="project"
                    uploadContextId={selectedTask?.projectId}
                    enableCopyPlainText
                />
            </div>
        </div>
    );
}
