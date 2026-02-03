/**
 * Project Detail Content Component
 * Contains TabBar with: TaskList, TodayList, Kanban, Timeline
 */

import React, { useState } from "react";
import { ListTodo, Columns, GanttChartSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskList } from "./TaskList";
import { TaskKanbanView } from "./TaskKanbanView";
import { TaskTimelineView } from "./TaskTimelineView";
import { TaskProvider } from "@/store/task/useTask.store";
import { ProjectGeneral } from "./ProjectGeneral";

type TabType = "general" | "taskList" | "kanban" | "timeline";

interface TabConfig {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
}

const TABS: TabConfig[] = [
    { id: "general", label: "GENERAL", icon: <Settings className="h-4 w-4" /> },
    { id: "taskList", label: "TASKS", icon: <ListTodo className="h-4 w-4" /> },
    { id: "kanban", label: "KANBAN", icon: <Columns className="h-4 w-4" /> },
    { id: "timeline", label: "TIMELINE", icon: <GanttChartSquare className="h-4 w-4" /> },
];

interface ProjectDetailContentProps {
    projectId: number;
}

/**
 * ProjectDetailContent
 * Main content area with tab navigation for different project views
 */
export function ProjectDetailContent({ projectId }: ProjectDetailContentProps) {
    const [activeTab, setActiveTab] = useState<TabType>("general");

    const renderTabContent = () => {
        switch (activeTab) {
            case "general":
                return <ProjectGeneral projectId={projectId} />;
            case "taskList":
                return (
                    <TaskProvider>
                        <TaskList projectId={projectId} />
                    </TaskProvider>
                );
            case "kanban":
                return (
                    <TaskProvider>
                        <TaskKanbanView projectId={projectId} />
                    </TaskProvider>
                );
            case "timeline":
                return (
                    <TaskProvider>
                        <TaskTimelineView projectId={projectId} />
                    </TaskProvider>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background">
            {/* TabBar - Project style with uppercase labels */}
            <div className="flex border-b-2 border-primary/20 bg-muted/20">
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

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {renderTabContent()}
            </div>
        </div>
    );
}
