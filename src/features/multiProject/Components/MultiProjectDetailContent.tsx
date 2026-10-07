/**
 * Multi-Project Detail Content Component
 * Shows combined view of tasks from multiple selected projects.
 * NO props — reads from selector/helper/headless.
 */

import React from "react";
import { ListTodo, Columns, GanttChartSquare, CalendarRange, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/shared";
import { MultiProjectTaskList } from "./MultiProjectTaskList";
import { MultiProjectKanbanView } from "./MultiProjectKanbanView";
import { MultiProjectProTimelineView } from "./MultiProjectProTimelineView";
import { MultiProjectTimelineView } from "./MultiProjectTimelineView";
import { MultiProjectTaskFlowView } from "./MultiProjectTaskFlowView";
import { ProjectChip } from "./small/ProjectChip";
import { useMultiProjectDetailHeadless } from "../hooks/mpDetail/useMultiProjectDetail.headless";
import { useMultiProjectDetailSelector } from "../Selectors/useMultiProjectDetail.selector";
import { useMultiProjectDetailHelper } from "../hooks/mpDetail/useMultiProjectDetail.helper";
import { useMultiProjectTaskGridHelper } from "../hooks/mpTaskList/useMultiProjectTaskGrid.helper";
import type { TabType, TabConfig } from "../types/multiProjectDetail.type";
import {TaskFilterPopup, TaskSearchInput} from "@/features/project";

const TABS: TabConfig[] = [
    { id: "proTimeline", label: "Project timeline", icon: <CalendarRange className="h-3.5 w-3.5" /> },
    { id: "taskList", label: "All tasks", icon: <ListTodo className="h-3.5 w-3.5" /> },
    { id: "kanban", label: "Kanban", icon: <Columns className="h-3.5 w-3.5" /> },
    { id: "timeline", label: "Task timeline", icon: <GanttChartSquare className="h-3.5 w-3.5" /> },
    // TASK FLOW hidden (task #1473) — view code kept; a saved "taskFlow" inner tab falls back to ALL TASKS.
];

/**
 * MultiProjectDetailContent — NO props
 * Reads from selector + helper + headless
 */
export function MultiProjectDetailContent() {
    // ── Computed values (from selector) ──────────────────
    const { activeTab, availableProjects, selectedProjectIds, filteredProjectIds, taskSearchQuery, taskGridIsLoading } = useMultiProjectDetailSelector();

    // ── Handlers (from helper) ───────────────────────────
    const { setActiveTab, handleToggleProject, handleSelectAllActive, handleSelectAll, handleClearAll, setTaskSearchQuery } = useMultiProjectDetailHelper();
    const { loadTasksForProjects } = useMultiProjectTaskGridHelper();

    // ── Side-effects (headless) ──────────────────────────
    useMultiProjectDetailHeadless();

    const handleRefreshTasks = () => {
        if (filteredProjectIds.length === 0 || taskGridIsLoading) return;
        loadTasksForProjects(filteredProjectIds);
    };

    const renderTabContent = () => {
        if (filteredProjectIds.length === 0) {
            return (<div className="flex items-center justify-center h-full text-muted-foreground"><p>Select at least one project to view</p></div>);
        }
        switch (activeTab) {
            case "taskList":
                return <MultiProjectTaskList />;
            case "kanban":
                return <MultiProjectKanbanView />;
            case "proTimeline":
                return <MultiProjectProTimelineView />;
            case "timeline":
                return <MultiProjectTimelineView />;
            case "taskFlow":
                return <MultiProjectTaskFlowView />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background">
            {/* Project Selector Chips */}
            <div className="flex items-center gap-3 px-3 py-2 border-b border-sa-border">
                <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap uppercase tracking-wide">Projects</span>
                <ScrollArea className="flex-1 whitespace-nowrap">
                    <div className="flex items-center gap-2 pb-1">
                        {availableProjects.map((project) => (
                            <ProjectChip key={project.id} project={project} isSelected={selectedProjectIds.includes(project.id)} onToggle={handleToggleProject} />
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="h-1.5" />
                </ScrollArea>
                <div className="flex items-center gap-0.5 flex-shrink-0 border-l border-sa-border pl-2">
                    <button onClick={handleSelectAllActive} className="h-7 px-2.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-sa-hover-strong rounded-md transition-colors duration-100" title="Select all active projects">Active</button>
                    <button onClick={handleSelectAll} className="h-7 px-2.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-sa-hover-strong rounded-md transition-colors duration-100" title="Select all projects">All</button>
                    <button onClick={handleClearAll} className="h-7 px-2.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-sa-hover-strong rounded-md transition-colors duration-100" title="Clear selection">Clear</button>
                </div>
            </div>

            {/* TabBar */}
            <div className="flex items-center gap-2 border-b border-sa-border px-3 py-2">
                <div className="flex flex-1">
                    <div className="inline-flex items-center gap-0.5 rounded-full border border-sa-border bg-sa-surface p-0.5">
                    {TABS.map((tab) => (
                        <button key={tab.id} onClick={() => !tab.disabled && setActiveTab(tab.id)} disabled={tab.disabled} className={cn("flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors duration-100", activeTab === tab.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground", tab.disabled && "opacity-50 cursor-not-allowed")}>
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                    </div>
                </div>
                <div className="flex items-center gap-1 px-2">
                    <span className="font-mono text-[12px] text-muted-foreground mr-1">{filteredProjectIds.length}/{availableProjects.length}</span>
                    {activeTab === "taskList" && <TaskSearchInput value={taskSearchQuery} onSearch={setTaskSearchQuery} />}
                    {(activeTab === "taskList" || activeTab === "kanban" || activeTab === "timeline") && (
                        <button
                            onClick={handleRefreshTasks}
                            disabled={filteredProjectIds.length === 0 || taskGridIsLoading}
                            className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-sa-hover-strong transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh tasks"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", taskGridIsLoading && "animate-spin")} />
                        </button>
                    )}
                    {(activeTab === "taskList" || activeTab === "kanban" || activeTab === "timeline") && <TaskFilterPopup />}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">{renderTabContent()}</div>
        </div>
    );
}
