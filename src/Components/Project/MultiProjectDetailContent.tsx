/**
 * Multi-Project Detail Content Component
 * Shows combined view of tasks from multiple selected projects
 * Contains TabBar with: TaskList, Kanban, Timeline (same as ProjectDetailContent)
 * Uses chip selector to choose which projects to display (instead of grid checkboxes)
 */

import React, { useState, useMemo, useEffect } from "react";
import { ListTodo, Columns, GanttChartSquare, X, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { MultiProjectTaskList } from "./MultiProjectTaskList";
import { MultiProjectKanbanView } from "./MultiProjectKanbanView";
import { MultiProjectTimelineView } from "./MultiProjectTimelineView";
import { MultiProjectProTimelineView } from "./MultiProjectProTimelineView";
import { TaskProvider } from "@/store/task/useTask.store";
import { Project, useProjectStore } from "@/store/project/useProject.store";
import { getProjectStatusColors } from "./ProjectStatusBadge";
import { ScrollArea, ScrollBar } from "@/Components/ui/scroll-area";

type TabType = "taskList" | "kanban" | "proTimeline" | "timeline";

interface TabConfig {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
}

const TABS: TabConfig[] = [
    { id: "proTimeline", label: "ProTimeline", icon: <CalendarRange className="h-4 w-4" /> },
    { id: "taskList", label: "Task List", icon: <ListTodo className="h-4 w-4" /> },
    { id: "kanban", label: "Kanban", icon: <Columns className="h-4 w-4" /> },
    { id: "timeline", label: "Timeline", icon: <GanttChartSquare className="h-4 w-4" /> },
];

interface MultiProjectDetailContentProps {
    projectIds: number[];
    projects: Project[];
}

/**
 * Project Chip Component
 * Displays project name with status color indicator
 */
interface ProjectChipProps {
    project: Project;
    isSelected: boolean;
    onToggle: (projectId: number) => void;
}

function ProjectChip({ project, isSelected, onToggle }: ProjectChipProps) {
    const statusColors = getProjectStatusColors(project.status || "");

    return (
        <button
            onClick={() => onToggle(project.id)}
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                "border cursor-pointer whitespace-nowrap",
                isSelected
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
            )}
        >
            {/* Status color dot */}
            <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: statusColors.bg }}
            />
            <span className="truncate max-w-[150px]">{project.name}</span>
            {isSelected && (
                <X className="h-3 w-3 flex-shrink-0 opacity-60 hover:opacity-100" />
            )}
        </button>
    );
}

/**
 * MultiProjectDetailContent
 * Main content area with tab navigation for combined project views
 */
export function MultiProjectDetailContent({ projectIds, projects }: MultiProjectDetailContentProps) {
    const [activeTab, setActiveTab] = useState<TabType>("proTimeline");
    const { projects: allProjects } = useProjectStore();

    // Selected project IDs state - default to all active projects
    const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>(() => {
        // Default: select all projects with status = "active" (active)
        const activeProjects = allProjects.filter(p => p.status === "active" && !p.deletedAt);
        return activeProjects.map(p => p.id);
    });

    // Re-initialize when allProjects changes (first load)
    useEffect(() => {
        if (allProjects.length > 0 && selectedProjectIds.length === 0) {
            const activeProjects = allProjects.filter(p => p.status === "active" && !p.deletedAt);
            setSelectedProjectIds(activeProjects.map(p => p.id));
        }
    }, [allProjects]);

    // All available projects (from store, not from tab props)
    const availableProjects = useMemo(() => {
        return allProjects.filter(p => !p.deletedAt);
    }, [allProjects]);

    // Filter selected projects based on selectedProjectIds
    const filteredProjects = useMemo(() => {
        return availableProjects.filter(p => selectedProjectIds.includes(p.id));
    }, [availableProjects, selectedProjectIds]);

    const filteredProjectIds = useMemo(() => {
        return filteredProjects.map(p => p.id);
    }, [filteredProjects]);

    // Toggle project selection
    const handleToggleProject = (projectId: number) => {
        setSelectedProjectIds(prev => {
            if (prev.includes(projectId)) {
                return prev.filter(id => id !== projectId);
            } else {
                return [...prev, projectId];
            }
        });
    };

    // Select all active projects
    const handleSelectAllActive = () => {
        const activeProjects = availableProjects.filter(p => p.status === "active");
        setSelectedProjectIds(activeProjects.map(p => p.id));
    };

    // Select all projects
    const handleSelectAll = () => {
        setSelectedProjectIds(availableProjects.map(p => p.id));
    };

    // Clear all selections
    const handleClearAll = () => {
        setSelectedProjectIds([]);
    };

    const renderTabContent = () => {
        if (filteredProjectIds.length === 0) {
            return (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Select at least one project to view</p>
                </div>
            );
        }

        switch (activeTab) {
            case "taskList":
                return (
                    <TaskProvider>
                        <MultiProjectTaskList projectIds={filteredProjectIds} projects={filteredProjects} />
                    </TaskProvider>
                );
            case "kanban":
                return (
                    <TaskProvider>
                        <MultiProjectKanbanView projectIds={filteredProjectIds} projects={filteredProjects} />
                    </TaskProvider>
                );
            case "proTimeline":
                return (
                    <MultiProjectProTimelineView projectIds={filteredProjectIds} projects={filteredProjects} />
                );
            case "timeline":
                return (
                    <TaskProvider>
                        <MultiProjectTimelineView projectIds={filteredProjectIds} projects={filteredProjects} />
                    </TaskProvider>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background">
            {/* Project Selector Chips */}
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Projects:</span>

                <ScrollArea className="flex-1 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 pb-1">
                        {availableProjects.map((project) => (
                            <ProjectChip
                                key={project.id}
                                project={project}
                                isSelected={selectedProjectIds.includes(project.id)}
                                onToggle={handleToggleProject}
                            />
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="h-1.5" />
                </ScrollArea>

                {/* Quick actions */}
                <div className="flex items-center gap-1 flex-shrink-0 border-l pl-2">
                    <button
                        onClick={handleSelectAllActive}
                        className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Select all active projects"
                    >
                        Active
                    </button>
                    <button
                        onClick={handleSelectAll}
                        className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Select all projects"
                    >
                        All
                    </button>
                    <button
                        onClick={handleClearAll}
                        className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Clear selection"
                    >
                        Clear
                    </button>
                </div>
            </div>

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

                {/* Selected count indicator */}
                <div className="ml-auto flex items-center px-3 text-xs text-muted-foreground">
                    {filteredProjectIds.length} of {availableProjects.length} projects selected
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {renderTabContent()}
            </div>
        </div>
    );
}
