/**
 * Project Detail Content Component
 * Contains TabBar with: TaskList, TodayList, Kanban, Timeline
 */

import React, { useCallback, useMemo } from "react";
import { ListTodo, Columns, GanttChartSquare, Settings, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskList } from "./TaskList";
import { TaskKanbanView } from "./TaskKanbanView";
import { TaskTimelineView } from "./TaskTimelineView";
import { TaskProvider } from "@/store/task/useTask.store";
import { ProjectGeneral } from "./ProjectGeneral";
import { TaskFilterPopup } from "./TaskFilterPopup";
import { useEditorTabsStore } from "@/store/index";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useNavigationStore } from "@/contexts/NavigationContext";
import { useWorkspaceHelper } from "@/hooks/workspace/useWorkspaceHelper";
import { constants } from "@/utils/index";
import { Project } from "@/store/project/useProject.store";
import { Button } from "@/Components/ui/button";

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
    tabId: string; // The editor tab ID to persist inner tab state
}

/**
 * ProjectDetailContent
 * Main content area with tab navigation for different project views
 */
export function ProjectDetailContent({ projectId, tabId }: ProjectDetailContentProps) {
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { setSelectedWorkspaceId } = useWorkspaceStore();
    const { navigateToView } = useNavigationStore();
    const { saveNewsBeforeNavigate } = useWorkspaceHelper();

    // Get active inner tab from editor tab metadata, default to "general"
    const currentTab = openTabs.find((t) => t.id === tabId);
    const activeTab: TabType = (currentTab?.metadata?.innerTab as TabType) || "general";

    // Get project data from the open tab
    const selectedProject = useMemo(() => {
        const projectTab = openTabs.find(
            (tab) => tab.type === constants.vscode.tab.tabTypes.project && (tab.data as Project).id === projectId
        );
        return projectTab ? (projectTab.data as Project) : undefined;
    }, [openTabs, projectId]);

    // Navigate to workspace view for this project
    const handleOpenWorkspace = useCallback(async () => {
        if (!selectedProject?.workspaceId) return;
        await saveNewsBeforeNavigate();
        setSelectedWorkspaceId(selectedProject.workspaceId);
        navigateToView(constants.navigation.views.workspace);
    }, [selectedProject?.workspaceId, saveNewsBeforeNavigate, setSelectedWorkspaceId, navigateToView]);

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

    const renderTabContent = () => {
        switch (activeTab) {
            case "general":
                return <ProjectGeneral projectId={projectId} />;
            case "taskList":
                return <TaskList projectId={projectId} />;
            case "kanban":
                return <TaskKanbanView projectId={projectId} />;
            case "timeline":
                return <TaskTimelineView projectId={projectId} />;
            default:
                return null;
        }
    };

    const showTaskFilter = activeTab === "taskList" || activeTab === "kanban" || activeTab === "timeline";

    return (
        <div className="flex flex-col h-full w-full bg-background">
            <TaskProvider>
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
            </TaskProvider>
        </div>
    );
}
