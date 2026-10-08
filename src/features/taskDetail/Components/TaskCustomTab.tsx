/**
 * TaskCustomTab — content panel for a user-created custom tab.
 * Format: Name: xxx / Version: xxx / --- / body
 *
 * Reads focus/dirty state from useTaskSectionStore — no props except tabId.
 * Registers save/discard handlers in customTabHandlersRef on mount.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { RichTextEditor } from "@/shared";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskDetailFormHelper } from "../hooks/useTaskDetailForm.helper";
import { useTaskCommentHelper } from "../hooks/taskComment/useTaskComment.helper";
import { useAuthStore } from "@/shared";
import { useTaskDetailSectionStore } from "../store/useTaskDetailSection.store";
import { useTaskSectionStore } from "../store/useTaskSection.store";
import { taskService } from "../service/task.service";
import { Task } from "../types/task.types";
import { type CustomTab } from "../types/customTab.types";
import {
    parseCustomTabs,
    serializeCustomTabs,
    extractNameVersion,
    validateCustomTabFormat,
} from "../utils/customTab.utils";
import { useEditorTabBarHelper } from "@/shell";

/** Loop-rendered: accepts only the tabId identifier. */
export function TaskCustomTab({ tabId }: { tabId: string }) {
    const { selectedTask, isDisabled } = useTaskDetailSelector();
    const { handleFieldChange } = useTaskDetailFormHelper();
    const { submitVersionComment } = useTaskCommentHelper();
    const { $user } = useAuthStore();
    const { getActiveTab, patchTab } = useEditorTabBarHelper();
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

    const latestHandlersRef = useRef({ save: async () => {}, discard: () => {} });

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
            const activeTabId = getActiveTab()?.id;
            if (activeTabId) patchTab(activeTabId, (cur) => ({
                data: { ...(cur.data as Task), customTabsJson: json },
                data0: { ...(cur.data as Task), customTabsJson: json },
            }));
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

    // Keep latest save/discard in a ref so the store always calls the current closure
    useEffect(() => {
        latestHandlersRef.current = { save, discard };
    });

    // ── Register handlers in store (replaces forwardRef + useImperativeHandle) ──
    useEffect(() => {
        customTabHandlersRef.current[tabId] = {
            save: () => latestHandlersRef.current.save(),
            discard: () => latestHandlersRef.current.discard(),
        };
        return () => { delete customTabHandlersRef.current[tabId]; };
    }, [tabId, customTabHandlersRef]);

    if (!tab) {
        return (
            <div className="flex h-[200px] items-center justify-center text-[13px] text-muted-foreground">
                Tab not found.
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {validationError && (
                <div className="mb-1 shrink-0 rounded-lg border border-sa-danger/35 bg-sa-danger/10 px-2 py-1 text-xs text-sa-danger">
                    {validationError}
                </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-sa-border">
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
