/**
 * Task Reflect Helper
 * Rows of the Reflect tab are edited locally; the section's Save button (Ctrl+S when only this section is dirty)
 * writes them into Task.customTabsJson (`reflect` key), Discard restores the saved rows.
 */

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/shared";
import { useEditorTabBarHelper } from "@/shell";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskDetailSectionStore } from "../../store/useTaskDetailSection.store";
import { taskService } from "../../service/task.service";
import type { ReflectField, ReflectRow } from "../../types/taskReflect.types";
import type { Task } from "../../types/task.types";
import {
    buildReflectTypeOptions,
    createReflectRow,
    isSameReflectRows,
    keepFilledReflectRows,
    parseReflectRows,
    withReflectRows,
} from "../../utils/taskReflect.utils";

export const useTaskReflectHelper = () => {
    const { selectedTask, isDisabled } = useTaskDetailSelector();
    const { activeSection } = useTaskDetailSectionStore();
    const { $user } = useAuthStore();
    const { getActiveTab, patchTab } = useEditorTabBarHelper();

    const taskId = selectedTask?.id ?? 0;
    const taskJson = selectedTask?.customTabsJson ?? null;

    const containerRef = useRef<HTMLDivElement>(null);
    const [rows, setRows] = useState<ReflectRow[]>(() => parseReflectRows(taskJson));
    const savedRef = useRef<ReflectRow[]>(rows);
    const ownStampRef = useRef(`${taskId}:${taskJson}`);

    const isDirty = !isSameReflectRows(rows, savedRef.current);

    // Reload when the task changes from outside (another task, an AI edit), not after our own save
    useEffect(() => {
        const stamp = `${taskId}:${taskJson}`;
        if (stamp === ownStampRef.current) return;
        ownStampRef.current = stamp;
        const next = parseReflectRows(taskJson);
        savedRef.current = next;
        setRows(next);
    }, [taskId, taskJson]);

    const handleFieldChange = (rowId: string, field: ReflectField, value: string) => {
        setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value, updatedAt: new Date().toISOString() } : r)));
    };

    const handleAddRow = () => setRows((prev) => [...prev, createReflectRow()]);

    const save = async () => {
        if (taskId <= 0) return;
        const toSave = keepFilledReflectRows(rows);
        const json = withReflectRows(taskJson, toSave);
        try {
            await taskService._patchTask($user.userToken, taskId, { customTabsJson: json });
        } catch (error) {
            console.error("Reflect save failed", error);
            return; // stay dirty so Save stays lit
        }
        ownStampRef.current = `${taskId}:${json}`;
        savedRef.current = toSave;
        setRows(toSave);
        const activeTabId = getActiveTab()?.id;
        if (activeTabId) {
            patchTab(activeTabId, (cur) => ({
                data: { ...(cur.data as Task), customTabsJson: json },
                data0: { ...(cur.data as Task), customTabsJson: json },
            }));
        }
    };

    const discard = () => setRows(savedRef.current);

    const autoGrow = (el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = "auto";
        if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`;
    };

    // The tab is mounted while hidden (height 0), so size the cells again once it is shown
    useEffect(() => {
        if (activeSection !== "reflect") return;
        const frame = requestAnimationFrame(() => {
            containerRef.current?.querySelectorAll("textarea").forEach(autoGrow);
        });
        return () => cancelAnimationFrame(frame);
    }, [activeSection, rows]);

    return {
        containerRef,
        rows,
        isDirty,
        isDisabled,
        typeOptions: buildReflectTypeOptions(rows),
        handleFieldChange,
        handleAddRow,
        autoGrow,
        save,
        discard,
    };
};
