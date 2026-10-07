/**
 * Project Detail Content Component
 * Contains TabBar with: General, TaskGrid, Kanban, Timeline
 * Pure UI — reads from selector and helper. NO props.
 */

import React from "react";
import { ListTodo, Columns, GanttChartSquare, Settings, FolderOpen, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared";
import { ProjectGeneral } from "./ProjectGeneral";
import { TaskGrid } from "@/features/project/task/Components/TaskGrid";
import { TaskKanbanView } from "@/features/project/task/Components/TaskKanbanView";
import { TaskTimelineView } from "@/features/project/task/Components/TaskTimelineView";
import { useProjectDetailSelector } from "../Selectors/useProjectDetail.selector";
import { useProjectDetailHelper } from "../hooks/useProjectDetail.helper";
import { useTaskGridHelper } from "../task/hooks/taskList/useTaskGrid.helper";
import type { TabConfig, TabType } from "../types/projectDetail.type";
import {useProjectDetailHeadless} from "../hooks/useProjectDetail.headless";
import {TaskFilterPopup} from "../task/Components/TaskFilterPopup";
import {TaskSearchInput} from "../task/Components/TaskSearchInput";

const TABS: TabConfig[] = [
    { id: "general", label: "General", icon: <Settings className="h-3.5 w-3.5" /> },
    { id: "taskList", label: "Tasks", icon: <ListTodo className="h-3.5 w-3.5" /> },
    { id: "kanban", label: "Kanban", icon: <Columns className="h-3.5 w-3.5" /> },
    { id: "timeline", label: "Timeline", icon: <GanttChartSquare className="h-3.5 w-3.5" /> },
];

const TAB_CONTENT: Record<TabType, React.ComponentType> = {
    general: ProjectGeneral,
    taskList: TaskGrid,
    kanban: TaskKanbanView,
    timeline: TaskTimelineView,
};

/**
 * ProjectDetailContent
 * Main content area with tab navigation for different project views
 * Pure UI — NO props, NO business logic.
 */
export function ProjectDetailContent() {
    // ── Computed values (from selector) ──────────────────
    const { activeTab, selectedProject, showTaskFilter, taskGridIsLoading, projectId } = useProjectDetailSelector();

    // ── Handlers (from helper) ───────────────────────────
    const { setActiveTab, handleOpenWorkspace } = useProjectDetailHelper();
    const { loadTasks } = useTaskGridHelper();
    useProjectDetailHeadless()

    const TabContent = TAB_CONTENT[activeTab] ?? null;

    const handleRefreshTasks = () => {
        if (taskGridIsLoading) return;
        loadTasks(projectId);
    };

    return (
        <div className="flex flex-col h-full w-full bg-background">
            {/* TabBar - pill segmented control (dashboard style, #1514) */}
                <div className="flex items-center gap-2 border-b border-sa-border px-3 py-2">
                    <div className="flex flex-1">
                        <div className="inline-flex items-center gap-0.5 rounded-full border border-sa-border bg-sa-surface p-0.5">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                                disabled={tab.disabled}
                                className={cn(
                                    "flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors duration-100",
                                    activeTab === tab.id
                                        ? "bg-foreground text-background"
                                        : "text-muted-foreground hover:text-foreground",
                                    tab.disabled && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                        </div>
                    </div>
                    {/* Right side actions */}
                    <div className="flex items-center gap-1 pr-2">
                        {activeTab === "taskList" && <TaskSearchInput />}
                        {showTaskFilter && (
                            <button
                                onClick={handleRefreshTasks}
                                disabled={taskGridIsLoading}
                                className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-sa-hover-strong transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Refresh tasks"
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", taskGridIsLoading && "animate-spin")} />
                            </button>
                        )}
                        {showTaskFilter && <TaskFilterPopup />}
                        {selectedProject?.workspaceId && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleOpenWorkspace}
                                className="h-7 px-2 text-[13px] text-muted-foreground hover:text-foreground"
                                title="Open project workspace"
                            >
                                <FolderOpen className="h-3.5 w-3.5" />
                                Workspace
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                    {TabContent && <TabContent />}
                </div>
        </div>
    );
}
