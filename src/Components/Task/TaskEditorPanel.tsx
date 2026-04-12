/**
 * Task Editor Panel
 * Editor panel for task tabs in VSCodeLayout
 * NO props — reads active tab from useEditorTabHelper.
 * All useEffect logic lives in TaskDetailHeadless.
 */

import React from "react";
import type { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "@/store/index";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { useTaskStore } from "@/store/task/useTask.store";
import { TaskDetailContent } from "./TaskDetailContent";
import { TaskDetailHeadless } from "@/HeadlessComponents/task/TaskDetailHeadless";

export function TaskEditorPanel() {
    const { setOpenTabs } = useEditorTabsStore();
    const { getActiveTab } = useEditorTabHelper();
    const { taskDetailContentRef } = useTaskStore();

    const activeTab = getActiveTab();

    if (!activeTab) return null;

    // Save scroll position when scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setOpenTabs((prev: BaseTab[]) => prev.map((t) => (t.id === activeTab.id ? { ...t, viewState: { ...t.viewState, scrollTop } } : t)));
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-background">
            <TaskDetailHeadless />
            {/* Content */}
            <div ref={taskDetailContentRef} onScroll={handleScroll} className="flex-1 overflow-auto bg-background">
                <TaskDetailContent />
            </div>
        </div>
    );
}
