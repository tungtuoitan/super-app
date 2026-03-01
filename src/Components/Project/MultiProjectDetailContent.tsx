/**
 * Multi-Project Detail Content Component
 * Shows combined view of tasks from multiple selected projects
 * Contains TabBar with: TaskList, Kanban, Timeline (same as ProjectDetailContent)
 * Uses chip selector to choose which projects to display (instead of grid checkboxes)
 */

import React, { useMemo, useEffect, useCallback } from "react";
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
import { useEditorTabsStore } from "@/store/index";
import { TaskFilterPopup } from "./TaskFilterPopup";

type TabType = "taskList" | "kanban" | "proTimeline" | "timeline";

interface TabConfig {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
}

const TABS: TabConfig[] = [
    { id: "proTimeline", label: "PROJECT TIMELINE", icon: <CalendarRange className="h-4 w-4" /> },
    { id: "taskList", label: "ALL TASKS", icon: <ListTodo className="h-4 w-4" /> },
    { id: "kanban", label: "KANBAN", icon: <Columns className="h-4 w-4" /> },
    { id: "timeline", label: "TASK TIMELINE", icon: <GanttChartSquare className="h-4 w-4" /> },
];

interface MultiProjectDetailContentProps {
    projectIds: number[];
    projects: Project[];
    tabId: string; // The editor tab ID to persist inner tab state
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
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all uppercase tracking-wide",
                "border-2 cursor-pointer whitespace-nowrap",
                isSelected
                    ? "bg-primary/15 border-primary text-primary"
                    : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:border-muted-foreground/30"
            )}
        >
            {/* Status color indicator bar */}
            <span
                className="w-1 h-4 rounded-sm flex-shrink-0"
                style={{ backgroundColor: statusColors.bg }}
            />
            <span className="truncate max-w-[150px]">{project.name}</span>
            {isSelected && (
                <X className="h-3.5 w-3.5 flex-shrink-0 opacity-60 hover:opacity-100" />
            )}
        </button>
    );
}

/**
 * MultiProjectDetailContent
 * Main content area with tab navigation for combined project views
 */
export function MultiProjectDetailContent({ projectIds, projects, tabId }: MultiProjectDetailContentProps) {
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { projects: allProjects } = useProjectStore();

    // Get active inner tab from editor tab metadata, default to "proTimeline"
    const currentTab = openTabs.find((t) => t.id === tabId);
    const activeTab: TabType = (currentTab?.metadata?.innerTab as TabType) || "proTimeline";

    // Update inner tab in editor tab metadata
    const setActiveTab = useCallback((newTab: TabType) => {
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === tabId
                    ? { ...t, metadata: { ...t.metadata, innerTab: newTab } }
                    : t
            )
        );
    }, [tabId, setOpenTabs]);

    // Get selected project IDs from editor tab metadata
    const selectedProjectIds: number[] = useMemo(() => {
        const saved = currentTab?.metadata?.selectedProjectIds as number[] | undefined;
        if (saved && saved.length > 0) return saved;
        // Default: select all projects with status = "active" (active)
        const activeProjects = allProjects.filter(p => p.status === "active" && !p.deletedAt);
        return activeProjects.map(p => p.id);
    }, [currentTab?.metadata?.selectedProjectIds, allProjects]);

    // Update selected project IDs in editor tab metadata
    const setSelectedProjectIds = useCallback((updater: number[] | ((prev: number[]) => number[])) => {
        setOpenTabs((prev) =>
            prev.map((t) => {
                if (t.id !== tabId) return t;
                const currentSelected = (t.metadata?.selectedProjectIds as number[]) || [];
                const newSelected = typeof updater === "function" ? updater(currentSelected) : updater;
                return { ...t, metadata: { ...t.metadata, selectedProjectIds: newSelected } };
            })
        );
    }, [tabId, setOpenTabs]);

    // Initialize selected projects on first load if not set
    useEffect(() => {
        if (allProjects.length > 0 && !currentTab?.metadata?.selectedProjectIds) {
            const activeProjects = allProjects.filter(p => p.status === "active" && !p.deletedAt);
            setSelectedProjectIds(activeProjects.map(p => p.id));
        }
    }, [allProjects, currentTab?.metadata?.selectedProjectIds, setSelectedProjectIds]);

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
            {/* Project Selector Chips - Project style header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-primary/20 bg-muted/10">
                <span className="text-xs font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">Select Projects:</span>

                <ScrollArea className="flex-1 whitespace-nowrap">
                    <div className="flex items-center gap-2 pb-1">
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
                <div className="flex items-center gap-1 flex-shrink-0 border-l-2 border-primary/20 pl-3">
                    <button
                        onClick={handleSelectAllActive}
                        className="text-xs font-semibold px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors uppercase tracking-wide"
                        title="Select all active projects"
                    >
                        Active
                    </button>
                    <button
                        onClick={handleSelectAll}
                        className="text-xs font-semibold px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors uppercase tracking-wide"
                        title="Select all projects"
                    >
                        All
                    </button>
                    <button
                        onClick={handleClearAll}
                        className="text-xs font-semibold px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors uppercase tracking-wide"
                        title="Clear selection"
                    >
                        Clear
                    </button>
                </div>
            </div>

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
                <div className="flex items-center gap-1 px-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
                        {filteredProjectIds.length} / {availableProjects.length} Projects
                    </span>
                    {(activeTab === "taskList" || activeTab === "kanban" || activeTab === "timeline") && (
                        <TaskFilterPopup />
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
