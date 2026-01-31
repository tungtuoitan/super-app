/**
 * Project Detail Content Component
 * Contains TabBar with: TaskList, TodayList, Kanban, Timeline
 */

import React, { useState } from "react";
import { ListTodo, CalendarDays, Columns, GanttChartSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskList } from "./TaskList";
import { TaskKanbanView } from "./TaskKanbanView";
import { TaskTimelineView } from "./TaskTimelineView";
import { TaskProvider } from "@/store/task/useTask.store";

type TabType = "taskList" | "todayList" | "kanban" | "timeline";

interface TabConfig {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
}

const TABS: TabConfig[] = [
    { id: "taskList", label: "Task List", icon: <ListTodo className="h-4 w-4" /> },
    { id: "todayList", label: "Today", icon: <CalendarDays className="h-4 w-4" />, disabled: true },
    { id: "kanban", label: "Kanban", icon: <Columns className="h-4 w-4" /> },
    { id: "timeline", label: "Timeline", icon: <GanttChartSquare className="h-4 w-4" /> },
];

interface ProjectDetailContentProps {
    projectId: number;
}

/**
 * ProjectDetailContent
 * Main content area with tab navigation for different project views
 */
export function ProjectDetailContent({ projectId }: ProjectDetailContentProps) {
    const [activeTab, setActiveTab] = useState<TabType>("taskList");

    const renderTabContent = () => {
        switch (activeTab) {
            case "taskList":
                return (
                    <TaskProvider>
                        <TaskList projectId={projectId} />
                    </TaskProvider>
                );
            case "todayList":
                return (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>Today List - Coming Soon</p>
                    </div>
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
