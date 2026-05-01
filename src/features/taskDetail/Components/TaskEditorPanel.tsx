/**
 * Task Editor Panel
 * Editor panel for task tabs in VSCodeLayout
 * NO props — reads active tab from useEditorTabBarHelper.
 * All useEffect logic lives in useTaskDetailHeadless.
 */

import React from "react";
import type { BaseTab } from "@/shell";
import { useEditorTabBarHelper } from "@/shell";
import { useTaskDetailStore } from "../store/useTaskDetail.store";
import { TaskDetailContent } from "./TaskDetailContent";
import { useTaskDetailHeadless } from "../hooks/useTaskDetail.headless";
import {useEditorTabBarStore} from "@/shell";

export function TaskEditorPanel() {
    const { setOpenTabs } = useEditorTabBarStore();
    const { getActiveTab } = useEditorTabBarHelper();
    const { taskDetailContentRef } = useTaskDetailStore();
    useTaskDetailHeadless();

    const activeTab = getActiveTab();

    if (!activeTab) return null;

    // Save scroll position when scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setOpenTabs((prev: BaseTab[]) => prev.map((t) => (t.id === activeTab.id ? { ...t, viewState: { ...t.viewState, scrollTop } } : t)));
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-background">
            {/* Content */}
            <div ref={taskDetailContentRef} onScroll={handleScroll} className="flex-1 overflow-auto bg-background">
                <TaskDetailContent />
            </div>
        </div>
    );
}
