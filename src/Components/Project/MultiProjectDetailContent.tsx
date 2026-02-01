/**
 * Multi-Project Detail Content Component
 * Shows combined view of tasks from multiple selected projects
 * Contains TabBar with: TaskList, Kanban, Timeline (same as ProjectDetailContent)
 */

import React, { useState } from "react";
import { ListTodo, Columns, GanttChartSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { MultiProjectTaskList } from "./MultiProjectTaskList";
import { MultiProjectKanbanView } from "./MultiProjectKanbanView";
import { MultiProjectTimelineView } from "./MultiProjectTimelineView";
import { TaskProvider } from "@/store/task/useTask.store";
import { Project } from "@/store/project/useProject.store";

type TabType = "taskList" | "kanban" | "timeline";

interface TabConfig {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
}

const TABS: TabConfig[] = [
    { id: "taskList", label: "Task List", icon: <ListTodo className="h-4 w-4" /> },
    { id: "kanban", label: "Kanban", icon: <Columns className="h-4 w-4" /> },
    { id: "timeline", label: "Timeline", icon: <GanttChartSquare className="h-4 w-4" /> },
];

interface MultiProjectDetailContentProps {
    projectIds: number[];
    projects: Project[];
}

/**
 * MultiProjectDetailContent
 * Main content area with tab navigation for combined project views
 */
export function MultiProjectDetailContent({ projectIds, projects }: MultiProjectDetailContentProps) {
    const [activeTab, setActiveTab] = useState<TabType>("taskList");

    const renderTabContent = () => {
        switch (activeTab) {
            case "taskList":
                return (
                    <TaskProvider>
                        <MultiProjectTaskList projectIds={projectIds} projects={projects} />
                    </TaskProvider>
                );
            case "kanban":
                return (
                    <TaskProvider>
                        <MultiProjectKanbanView projectIds={projectIds} projects={projects} />
                    </TaskProvider>
                );
            case "timeline":
                return (
                    <TaskProvider>
                        <MultiProjectTimelineView projectIds={projectIds} projects={projects} />
                    </TaskProvider>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background">
            {/* Header with project info */}
            {/* <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20">
                <span className="text-sm text-muted-foreground">
                    Viewing {projects.length} projects:
                </span>
                <span className="text-sm font-medium truncate">
                    {projects.map((p) => p.name).join(", ")}
                </span>
            </div> */}

            {/* TabBar */}
            <div className="flex border-b bg-muted/30">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => !tab.disabled && setActiveTab(tab.id)}
                        disabled={tab.disabled}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                            "border-b-2 -mb-[1px]",
                            activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground",
                            tab.disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {renderTabContent()}
            </div>
        </div>
    );
}
