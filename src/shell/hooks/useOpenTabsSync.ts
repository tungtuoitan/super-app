/**
 * Open Tabs Sync Component
 * Handles localStorage persistence for open editor tabs
 * - Saves tabs to localStorage when they change
 * - Loads and restores tabs on mount or userId change
 * This component doesn't render anything, just side effects
 */

import { useEffect, useState } from "react";
import { useAuthStore } from "@/shell/store/Auth.store";
import { useNoteGridStore } from "@/features/note/store/useNoteGrid.store";
import { useWsStore } from "@/features/workspace/store/ws/useWs.store";
import { useProjectStore } from "@/features/project/store/useProject.store";
import type { Task } from "@/features/taskDetail/types/task.types";
import { BaseTab, MultiProjectTabData } from "@/shell/types/tab.types";
import { constants } from "@/utils/constants";
import { Note, NoteDTO } from "@/features/note/types/note.types";
import { noteService } from "@/features/note/service/note.service";
import { wsService, WsDTO } from "@/features/workspace/service/ws.service";
import { projectService, ProjectDTO } from "@/features/project/service/project.service";
import { taskService, TaskDTO } from "@/features/taskDetail/service/task.service";
import { transformNotes } from "@/features/note/utils/note.utils";
import { transformWs } from "@/utils/ws.utils";
import { parseAsLocalDate } from "@/utils/date.utils";
import {useEditorTabHelper} from "@/shell/hooks/useEditorTab.helper";
import {Ws} from "@/features/workspace/types/workspace.types";
import {useEditorTabBarStore} from "../store/EditorTab.store";
import {Project} from "@/features/project";
import {usePTaskStore} from "@/features/project/store/usePTask.store";

// Storage types
export interface TabStorage {
    tabId: string;
    type: string;
    dataId: number | string; // number for single entity, string for comma-separated IDs (multiProject)
    index: number;
}

export interface OpenTabsStorage {
    tabs: TabStorage[];
}

// Helper to get storage key for user
export const getStorageKey = (userId: number | null | undefined): string | null => {
    if (!userId) return null;
    return `opentabs_${userId}`;
};

// Transform functions
const transformProjectData = (dtos: ProjectDTO[]): Project[] => {
    return dtos.map((dto) => ({
        id: dto.id,
        name: dto.name,
        description: dto.description,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        createdAt: new Date(dto.createdAt),
        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
        workspaceId: dto.workspaceId,
    }));
};

const transformTaskData = (dtos: TaskDTO[]): Task[] => {
    return dtos.map((dto) => ({
        id: dto.id,
        projectId: dto.projectId,
        parentTaskId: dto.parentTaskId,
        type: dto.type,
        taskType: dto.taskType || "personal",
        title: dto.title,
        note: dto.note,
        status: dto.status,
        priority: dto.priority,
        startDate: parseAsLocalDate(dto.startDate),
        endDate: parseAsLocalDate(dto.endDate),
        orderIndex: dto.orderIndex,
        createdAt: parseAsLocalDate(dto.createdAt) || new Date(),
        updatedAt: parseAsLocalDate(dto.updatedAt),
        deletedAt: parseAsLocalDate(dto.deletedAt),
        folderWorkspaceItemId: dto.folderWorkspaceItemId,
        checklistJson: dto.checklistJson ?? null,
        processJson: dto.processJson ?? null,
        customTabsJson: dto.customTabsJson ?? null,
    }));
};

export const useOpenTabSync = () => {
    const { openTabs, setOpenTabs, setActiveTabId, isLoadingTabs, setIsLoadingTabs } = useEditorTabBarStore();
    const { $user } = useAuthStore();
    const { notes } = useNoteGridStore();
    const { workspaces } = useWsStore();
    const { projects } = useProjectStore();
    const { tasks } = usePTaskStore();
    const { setNewTabAnd } = useEditorTabHelper();

    // Load tabs from localStorage on mount or userId change
    useEffect(() => {
        const restoreTabs = async () => {
            if(!$user.userId) return;
            const storageKey = getStorageKey($user.userId);
            if (!storageKey) {
                setOpenTabs([]);
                setNewTabAnd(null);
                return;
            }

            setIsLoadingTabs(true);

            try {
                const stored = localStorage.getItem(storageKey);
                if (!stored) {
                    setIsLoadingTabs(false);
                    return;
                }

                const data: OpenTabsStorage = JSON.parse(stored);
                if (!data.tabs || data.tabs.length === 0) {
                    setIsLoadingTabs(false);
                    return;
                }

                // Sort by index to restore correct order
                const sortedTabs = [...data.tabs].sort((a, b) => a.index - b.index);

                // Separate by type
                const noteTabs = sortedTabs.filter((t) => t.type === constants.vscode.tab.tabTypes.note);
                const wsTabs = sortedTabs.filter((t) => t.type === constants.vscode.tab.tabTypes.workspace);
                const projectTabs = sortedTabs.filter((t) => t.type === constants.vscode.tab.tabTypes.project);
                const taskTabs = sortedTabs.filter((t) => t.type === constants.vscode.tab.tabTypes.task);
                const multiProjectTabs = sortedTabs.filter((t) => t.type === constants.vscode.tab.tabTypes.multiProject);

                // Collect missing IDs
                const missingNoteIds: number[] = [];
                const missingWsIds: number[] = [];
                const missingProjectIds: number[] = [];
                const missingTaskIds: number[] = [];

                // Check which notes are missing from grid
                for (const tab of noteTabs) {
                    const existsInGrid = notes.find((n) => n.id === tab.dataId);
                    if (!existsInGrid) {
                        missingNoteIds.push(tab.dataId as number);
                    }
                }

                // Check which workspaces are missing from grid
                for (const tab of wsTabs) {
                    const existsInGrid = workspaces.find((w) => w.id === tab.dataId);
                    if (!existsInGrid) {
                        missingWsIds.push(tab.dataId as number);
                    }
                }

                // Check which projects are missing from store
                for (const tab of projectTabs) {
                    const existsInStore = projects.find((p) => p.id === tab.dataId);
                    if (!existsInStore) {
                        missingProjectIds.push(tab.dataId as number);
                    }
                }

                // Check which tasks are missing from store
                for (const tab of taskTabs) {
                    const existsInStore = tasks.find((t) => t.id === tab.dataId);
                    if (!existsInStore) {
                        missingTaskIds.push(tab.dataId as number);
                    }
                }

                // Collect all project IDs needed for multiProject tabs
                const multiProjectIds = new Set<number>();
                for (const tab of multiProjectTabs) {
                    const ids = (tab.dataId as string).split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
                    ids.forEach(id => {
                        if (!projects.find(p => p.id === id)) {
                            multiProjectIds.add(id);
                        }
                    });
                }

                // Fetch missing data from API using services
                let fetchedNotes: Note[] = [];
                let fetchedWs: Ws[] = [];
                let fetchedProjects: Project[] = [];
                let fetchedTasks: Task[] = [];

                if (!$user.userToken) {
                    console.error("No auth token found");
                    setIsLoadingTabs(false);
                    return;
                }

                if (missingNoteIds.length > 0) {
                    const idsString = missingNoteIds.join(",");
                    try {
                        const result = await noteService._getNotes($user.userToken, { ids: idsString });
                        if (result.success && result.data) {
                            // Convert DTOs to domain models
                            fetchedNotes = transformNotes(result.data as NoteDTO[]);
                        }
                    } catch (error) {
                        console.error("Failed to fetch notes by ids:", error);
                    }
                }

                if (missingWsIds.length > 0) {
                    const idsString = missingWsIds.join(",");
                    try {
                        const result = await wsService._getWs($user.userToken, { ids: idsString });
                        if (result.success && result.data) {
                            // Convert DTOs to domain models
                            fetchedWs = transformWs(result.data as WsDTO[]);
                        }
                    } catch (error) {
                        console.error("Failed to fetch workspaces by ids:", error);
                    }
                }

                // Fetch missing projects (including for multiProject tabs)
                const allMissingProjectIds = [...new Set([...missingProjectIds, ...multiProjectIds])];
                if (allMissingProjectIds.length > 0) {
                    const idsString = allMissingProjectIds.join(",");
                    try {
                        const result = await projectService._getProjects($user.userToken, { ids: idsString });
                        if (result.success && result.data) {
                            fetchedProjects = transformProjectData(result.data as ProjectDTO[]);
                        }
                    } catch (error) {
                        console.error("Failed to fetch projects by ids:", error);
                    }
                }

                // Fetch missing tasks
                if (missingTaskIds.length > 0) {
                    try {
                        // Task API doesn't support fetching by task ID directly,
                        // so we fetch all tasks and filter
                        const result = await taskService._getTasks($user.userToken, {});
                        if (result.success && result.data) {
                            const allTasks = transformTaskData(result.data as TaskDTO[]);
                            fetchedTasks = allTasks.filter(t => missingTaskIds.includes(t.id));
                        }
                    } catch (error) {
                        console.error("Failed to fetch tasks:", error);
                    }
                }

                // Now restore tabs with all data available
                const restoredTabs: BaseTab[] = [];

                // Helper to get all available projects (from store + fetched)
                const getAllProjects = () => [...projects, ...fetchedProjects];

                for (const tabStorage of sortedTabs) {
                    if (tabStorage.type === constants.vscode.tab.tabTypes.note) {
                        // Try grid first, then fetched data
                        let noteData = notes.find((n) => n.id === tabStorage.dataId);
                        if (!noteData) {
                            noteData = fetchedNotes.find((n) => n.id === tabStorage.dataId);
                        }

                        if (noteData) {
                            restoredTabs.push({
                                id: tabStorage.tabId,
                                type: constants.vscode.tab.tabTypes.note,
                                data: noteData,
                                data0: noteData,
                                title: noteData.name || constants.vscode.tabTitles.unsavedNote,
                                hasUnsavedChanges: false,
                            });
                        }
                    } else if (tabStorage.type === constants.vscode.tab.tabTypes.workspace) {
                        // Try grid first, then fetched data
                        let wsData = workspaces.find((w) => w.id === tabStorage.dataId);
                        if (!wsData) {
                            wsData = fetchedWs.find((w) => w.id === tabStorage.dataId);
                        }

                        if (wsData) {
                            restoredTabs.push({
                                id: tabStorage.tabId,
                                type: constants.vscode.tab.tabTypes.workspace,
                                data: wsData,
                                data0: wsData,
                                title: wsData.name || constants.vscode.tabTitles.unsavedWorkspace,
                                hasUnsavedChanges: false,
                            });
                        }
                    } else if (tabStorage.type === constants.vscode.tab.tabTypes.project) {
                        // Try store first, then fetched data
                        let projectData = projects.find((p) => p.id === tabStorage.dataId);
                        if (!projectData) {
                            projectData = fetchedProjects.find((p) => p.id === tabStorage.dataId);
                        }

                        if (projectData) {
                            restoredTabs.push({
                                id: tabStorage.tabId,
                                type: constants.vscode.tab.tabTypes.project,
                                data: projectData,
                                data0: projectData,
                                title: projectData.name || constants.vscode.tabTitles.unsavedProject,
                                hasUnsavedChanges: false,
                            });
                        }
                    } else if (tabStorage.type === constants.vscode.tab.tabTypes.task) {
                        // Try store first, then fetched data
                        let taskData = tasks.find((t) => t.id === tabStorage.dataId);
                        if (!taskData) {
                            taskData = fetchedTasks.find((t) => t.id === tabStorage.dataId);
                        }

                        if (taskData) {
                            restoredTabs.push({
                                id: tabStorage.tabId,
                                type: constants.vscode.tab.tabTypes.task,
                                data: taskData,
                                data0: taskData,
                                title: taskData.title || constants.vscode.tabTitles.unsavedTask,
                                hasUnsavedChanges: false,
                            });
                        }
                    } else if (tabStorage.type === constants.vscode.tab.tabTypes.multiProject) {
                        // Parse project IDs from comma-separated string
                        const projectIds = (tabStorage.dataId as string).split(',').map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
                        const allProjects = getAllProjects();
                        const projectsData = projectIds.map(id => allProjects.find(p => p.id === id)).filter(Boolean) as Project[];

                        // Only restore if we have at least some projects
                        if (projectsData.length > 0) {
                            const tabData: MultiProjectTabData = {
                                projectIds,
                                projects: projectsData,
                            };
                            restoredTabs.push({
                                id: tabStorage.tabId,
                                type: constants.vscode.tab.tabTypes.multiProject,
                                data: tabData,
                                data0: tabData,
                                title: "Multiple-Projects",
                                hasUnsavedChanges: false,
                            });
                        }
                    }
                }

                // Set restored tabs
                setOpenTabs(restoredTabs);
                setNewTabAnd(restoredTabs[restoredTabs.length - 1].id);
            } catch (error) {
                console.error("Failed to restore tabs from localStorage:", error);
                setOpenTabs([]);
                setNewTabAnd(null);
            } finally {
                setIsLoadingTabs(false);
            }
        };

        restoreTabs();
    }, [$user.userId]);

    // Save tabs to localStorage whenever they change
    useEffect(() => {
        const storageKey = getStorageKey($user.userId);
        if (!storageKey || openTabs.length === 0 || isLoadingTabs) return;

        try {
            const tabsToSave: TabStorage[] = openTabs
                .map((tab, index) => {
                    let dataId: number | string = 0;

                    if (tab.type === constants.vscode.tab.tabTypes.note) {
                        dataId = (tab.data as Note).id;
                    } else if (tab.type === constants.vscode.tab.tabTypes.workspace) {
                        dataId = (tab.data as Ws).id;
                    } else if (tab.type === constants.vscode.tab.tabTypes.project) {
                        dataId = (tab.data as Project).id;
                    } else if (tab.type === constants.vscode.tab.tabTypes.task) {
                        dataId = (tab.data as Task).id;
                    } else if (tab.type === constants.vscode.tab.tabTypes.multiProject) {
                        // Store as comma-separated project IDs string
                        dataId = (tab.data as MultiProjectTabData).projectIds.join(',');
                    }

                    // Skip tabs with invalid dataId (temp tabs with negative IDs)
                    if (typeof dataId === 'number' && dataId <= 0) {
                        return null;
                    }

                    return {
                        tabId: tab.id,
                        type: tab.type,
                        dataId: dataId,
                        index: index,
                    };
                })
                .filter(Boolean) as TabStorage[];

            const data: OpenTabsStorage = {
                tabs: tabsToSave,
            };

            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save tabs to localStorage:", error);
        }
    }, [openTabs, $user.userId, isLoadingTabs]);

    // This component doesn't render anything
    return null;
};
