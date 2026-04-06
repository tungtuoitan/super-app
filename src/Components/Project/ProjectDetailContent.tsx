/**
 * Project Detail Content Component
 * Contains TabBar with: General, TaskGrid, Kanban, Timeline
 * Pure UI — reads from selector and helper. NO props.
 */

import React from "react";
import { ListTodo, Columns, GanttChartSquare, Settings, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/Components/ui/button";
import { ProjectGeneral } from "./ProjectGeneral";
import { TaskGrid } from "../Task/TaskGrid";
import { TaskKanbanView } from "../Task/TaskKanbanView";
import { TaskTimelineView } from "../Task/TaskTimelineView";
import { TaskFilterPopup } from "../Task/TaskFilterPopup";
import { TaskSearchInput } from "../Task/small/TaskSearchInput";
import { useProjectDetailSelector } from "@/Selectors/project/useProjectDetail.selector";
import { useProjectDetailHelper } from "@/hooks/project/useProjectDetail.helper";
import { ProjectDetailHeadless } from "@/HeadlessComponents/project/ProjectDetailHeadless";
import type { TabConfig } from "../../types/project/projectDetail.type";

const TABS: TabConfig[] = [
    { id: "general", label: "GENERAL", icon: <Settings className="h-4 w-4" /> },
    { id: "taskList", label: "TASKS", icon: <ListTodo className="h-4 w-4" /> },
    { id: "kanban", label: "KANBAN", icon: <Columns className="h-4 w-4" /> },
    { id: "timeline", label: "TIMELINE", icon: <GanttChartSquare className="h-4 w-4" /> },
];

/**
 * ProjectDetailContent
 * Main content area with tab navigation for different project views
 * Pure UI — NO props, NO business logic.
 */
export function ProjectDetailContent() {
    // ── Computed values (from selector) ──────────────────
    const { activeTab, selectedProject, showTaskFilter } = useProjectDetailSelector();

    // ── Handlers (from helper) ───────────────────────────
    const { setActiveTab, handleOpenWorkspace } = useProjectDetailHelper();

    const renderTabContent = () => {
        switch (activeTab) {
            case "general":
                return <ProjectGeneral />;
            case "taskList":
                return <TaskGrid />;
            case "kanban":
                return <TaskKanbanView />;
            case "timeline":
                return <TaskTimelineView />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background">
            <ProjectDetailHeadless />
            {/* TabBar - Project style with uppercase labels */}
                <div className="flex items-center border-b-2 border-primary/20 bg-muted/20">
                    <div className="flex flex-1">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                                disabled={tab.disabled}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-3 text-xs font-bold transition-colors tracking-wider",
                                    "border-b-3 -mb-[2px]",
                                    activeTab === tab.id
                                        ? "border-primary text-primary bg-primary/5"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    tab.disabled && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    {/* Right side actions */}
                    <div className="flex items-center gap-1 pr-2">
                        {activeTab === "taskList" && <TaskSearchInput />}
                        {showTaskFilter && <TaskFilterPopup />}
                        {selectedProject?.workspaceId && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleOpenWorkspace}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                title="Open project workspace"
                            >
                                <FolderOpen className="h-4 w-4 mr-1" />
                                Workspace
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                    {renderTabContent()}
                </div>
        </div>
    );
}
