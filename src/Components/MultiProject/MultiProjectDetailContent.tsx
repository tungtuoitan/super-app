/**
 * Multi-Project Detail Content Component
 * Shows combined view of tasks from multiple selected projects.
 * NO props — reads from selector/helper/headless.
 */

import React from "react";
import { ListTodo, Columns, GanttChartSquare, CalendarRange, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/Components/ui/scroll-area";
import { MultiProjectTaskList } from "./MultiProjectTaskList";
import { MultiProjectKanbanView } from "./MultiProjectKanbanView";
import { MultiProjectProTimelineView } from "./MultiProjectProTimelineView";
import { MultiProjectTimelineView } from "./MultiProjectTimelineView";
import { MultiProjectTaskFlowView } from "./MultiProjectTaskFlowView";
import { TaskFilterPopup } from "../Task/TaskFilterPopup";
import { TaskSearchInput } from "../Task/small/TaskSearchInput";
import { ProjectChip } from "./small/ProjectChip";
import { useMultiProjectDetailHeadless } from "../../HeadlessComponents/multiProject/useMultiProjectDetail.headless";
import { useMultiProjectDetailSelector } from "../../Selectors/multipleProject/useMultiProjectDetail.selector";
import { useMultiProjectDetailHelper } from "../../hooks/multiProject/useMultiProjectDetail.helper";
import type { TabType, TabConfig } from "../../types/multiProject/multiProjectDetail.type";

const TABS: TabConfig[] = [
    { id: "proTimeline", label: "PROJECT TIMELINE", icon: <CalendarRange className="h-4 w-4" /> },
    { id: "taskList", label: "ALL TASKS", icon: <ListTodo className="h-4 w-4" /> },
    { id: "kanban", label: "KANBAN", icon: <Columns className="h-4 w-4" /> },
    { id: "timeline", label: "TASK TIMELINE", icon: <GanttChartSquare className="h-4 w-4" /> },
    { id: "taskFlow", label: "TASK FLOW", icon: <GitBranch className="h-4 w-4" /> },
];

/**
 * MultiProjectDetailContent — NO props
 * Reads from selector + helper + headless
 */
export function MultiProjectDetailContent() {
    // ── Computed values (from selector) ──────────────────
    const { activeTab, availableProjects, selectedProjectIds, filteredProjectIds } = useMultiProjectDetailSelector();

    // ── Handlers (from helper) ───────────────────────────
    const { setActiveTab, handleToggleProject, handleSelectAllActive, handleSelectAll, handleClearAll } = useMultiProjectDetailHelper();

    // ── Side-effects (headless) ──────────────────────────
    useMultiProjectDetailHeadless();

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
            <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-primary/20 bg-muted/10">
                <span className="text-xs font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">Select Projects:</span>
                <ScrollArea className="flex-1 whitespace-nowrap">
                    <div className="flex items-center gap-2 pb-1">
                        {availableProjects.map((project) => (
                            <ProjectChip key={project.id} project={project} isSelected={selectedProjectIds.includes(project.id)} onToggle={handleToggleProject} />
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="h-1.5" />
                </ScrollArea>
                <div className="flex items-center gap-1 flex-shrink-0 border-l-2 border-primary/20 pl-3">
                    <button onClick={handleSelectAllActive} className="text-xs font-semibold px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors uppercase tracking-wide" title="Select all active projects">Active</button>
                    <button onClick={handleSelectAll} className="text-xs font-semibold px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors uppercase tracking-wide" title="Select all projects">All</button>
                    <button onClick={handleClearAll} className="text-xs font-semibold px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors uppercase tracking-wide" title="Clear selection">Clear</button>
                </div>
            </div>

            {/* TabBar */}
            <div className="flex items-center border-b-2 border-primary/20 bg-muted/20">
                <div className="flex flex-1">
                    {TABS.map((tab) => (
                        <button key={tab.id} onClick={() => !tab.disabled && setActiveTab(tab.id)} disabled={tab.disabled} className={cn("flex items-center gap-2 px-5 py-3 text-xs font-bold transition-colors tracking-wider", "border-b-3 -mb-[2px]", activeTab === tab.id ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50", tab.disabled && "opacity-50 cursor-not-allowed")}>
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1 px-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">{filteredProjectIds.length} / {availableProjects.length} Projects</span>
                    {activeTab === "taskList" && <TaskSearchInput />}
                    {(activeTab === "taskList" || activeTab === "kanban" || activeTab === "timeline" || activeTab === "taskFlow") && <TaskFilterPopup />}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">{renderTabContent()}</div>
        </div>
    );
}
