/**
 * Task Reflect Helper
 * Holds the rows of the Reflect tab and saves them into Task.customTabsJson (`reflect` key).
 * Cells save themselves when the user leaves them; saves run one after another.
 */

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/shared";
import { useEditorTabBarHelper } from "@/shell";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskDetailSectionStore } from "../../store/useTaskDetailSection.store";
import { taskService } from "../../service/task.service";
import type { ReflectField, ReflectRow } from "../../types/taskReflect.types";
import type { Task } from "../../types/task.types";
import { applyReflectCell, buildReflectTypeOptions, createReflectRow, parseReflectRows, withReflectRows } from "../../utils/taskReflect.utils";

export const useTaskReflectHelper = () => {
    const { selectedTask, isDisabled } = useTaskDetailSelector();
    const { activeSection } = useTaskDetailSectionStore();
    const { $user } = useAuthStore();
    const { getActiveTab, patchTab } = useEditorTabBarHelper();

    const taskId = selectedTask?.id ?? 0;
    const taskJson = selectedTask?.customTabsJson ?? null;

    const [rows, setRows] = useState<ReflectRow[]>(() => parseReflectRows(taskJson));
    /** Bumped when the task changes from outside (another task, AI edit) so the cells reload */
    const [syncVersion, setSyncVersion] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const rowsRef = useRef(rows);
    const jsonRef = useRef(taskJson);
    const ownStampRef = useRef(`${taskId}:${taskJson}`);
    const queueRef = useRef<Promise<void>>(Promise.resolve());

    // Reload only when the stored JSON is not the one this tab just wrote itself
    useEffect(() => {
        const stamp = `${taskId}:${taskJson}`;
        if (stamp === ownStampRef.current) return;
        ownStampRef.current = stamp;
        jsonRef.current = taskJson;
        const next = parseReflectRows(taskJson);
        rowsRef.current = next;
        setRows(next);
        setSyncVersion((v) => v + 1);
    }, [taskId, taskJson]);

    const persist = (next: ReflectRow[]) => {
        rowsRef.current = next;
        setRows(next);
        if (taskId <= 0) return;
        const json = withReflectRows(jsonRef.current, next);
        jsonRef.current = json;
        ownStampRef.current = `${taskId}:${json}`;
        queueRef.current = queueRef.current
            .then(async () => {
                await taskService._patchTask($user.userToken, taskId, { customTabsJson: json });
                const activeTabId = getActiveTab()?.id;
                if (activeTabId) {
                    patchTab(activeTabId, (cur) => ({
                        data: { ...(cur.data as Task), customTabsJson: json },
                        data0: { ...(cur.data as Task), customTabsJson: json },
                    }));
                }
            })
            .catch((error) => console.error("Reflect save failed", error));
    };

    const handleCellCommit = (rowId: string, field: ReflectField, value: string) => {
        const next = applyReflectCell(rowsRef.current, rowId, field, value);
        if (next !== rowsRef.current) persist(next);
    };

    const handleAddRow = () => persist([...rowsRef.current, createReflectRow()]);

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
    }, [activeSection, rows, syncVersion]);

    return {
        containerRef,
        rows,
        syncVersion,
        isDisabled,
        typeOptions: buildReflectTypeOptions(rows),
        handleCellCommit,
        handleAddRow,
        autoGrow,
    };
};
