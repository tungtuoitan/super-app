/**
 * Project Detail Helper
 * Business logic for project detail operations
 */

import { useCallback } from "react";
import { Project, useProjectStore } from "@/store/project/useProject.store";
import { projectService, ProjectDTO } from "@/services/project.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "@/store/index";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useWorkspaceHelper } from "@/hooks/workspace/useWorkspaceHelper";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { useProjectDetailStore } from "@/store/project/useProjectDetail.store";
import { useConsoleHelper } from "../console/useConsole.helper";
import { parseAsLocalDate, toLocalISOString } from "@/utils/date.utils";
import { constants } from "@/utils/index";
import { useProjectDetailSelector } from "@/Selectors/project/useProjectDetail.selector";
import type { TabType } from "@/types/project/projectDetail.type";

/**
 * Transform project DTOs (dates as strings) to domain models (dates as Date objects)
 * Uses parseAsLocalDate to treat backend UTC as local time
 */
const transformProjectData = (dtos: ProjectDTO[]): Project[] => {
    return dtos.map((dto) => ({
        id: dto.id,
        name: dto.name,
        description: dto.description,
        status: dto.status,
        startDate: parseAsLocalDate(dto.startDate),
        endDate: parseAsLocalDate(dto.endDate),
        createdAt: parseAsLocalDate(dto.createdAt) || new Date(),
        updatedAt: parseAsLocalDate(dto.updatedAt),
        deletedAt: parseAsLocalDate(dto.deletedAt),
        workspaceId: dto.workspaceId,
    }));
};

export const useProjectDetailHelper = () => {
    const { $user } = useAuthStore();
    const { setProjects, setProjectGridIsLoading, setProjectGridError, setTotalCount } = useProjectStore();
    const _console = useConsoleHelper();
    const { setOpenTabs, activeTabId, openTabs } = useEditorTabsStore();
    const { setSelectedWorkspaceId } = useWorkspaceStore();
    const { saveNewsBeforeNavigate } = useWorkspaceHelper();
    const { setModuleName } = useGridControlStore();
    const { tabId } = useProjectDetailStore();
    const { selectedProject } = useProjectDetailSelector();

    // Load projects with filters (duplicated from grid helper to avoid circular dependency)
    const loadProjects = async () => {
        try {
            setProjectGridIsLoading(true);
            const token = $user.userToken;

            const filterParams = {
                deletedAt: "null", // Only active projects by default
            };

            const result = await projectService._getProjects(token, filterParams);

            if (!result.success) {
                throw new Error(result.message || "Failed to load projects");
            }

            const transformedData = transformProjectData(result.data || []);
            setProjects(transformedData);
            setTotalCount(result.totalCount || transformedData.length);
            setProjectGridError(null);
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setProjectGridError(new Error(errorMessage));

            if (isUnauthorizedError(err)) {
                _console.error("Unauthorized. Please login again.");
            }
        } finally {
            setProjectGridIsLoading(false);
        }
    };

    const handleProjectFieldChange = (field: keyof Project, value: any) => {
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t: BaseTab) => {
                if (t.id === activeTabId) {
                    const projectData = t.data as Project;
                    return {
                        ...t,
                        data: { ...projectData, [field]: value },
                        hasUnsavedChanges: true,
                    };
                }
                return t;
            })
        );
    };

    /**
     * Save current project (create or update using Upsert pattern)
     * @param tabId - Current tab ID to update after save
     */
    const upsertProject = useCallback(
        async (tabId?: string): Promise<Project | null> => {
            // Get project data from active tab
            const activeTab = openTabs.find((tab) => tab.id === (tabId || activeTabId));
            const selectedProject = activeTab?.data as Project | undefined;

            if (!selectedProject) {
                console.warn("No selected project to upsert");
                return null;
            }

            // ============================================================
            // Step 1.5: Validate name field
            // ============================================================
            if (!selectedProject.name || selectedProject.name.trim() === "") {
                _console.error("Project name is required");
                return null;
            }

            // ============================================================
            // Step 2: Determine operation mode (create/update/restore)
            // ============================================================
            const isCreateMode = selectedProject.id <= 0;
            const originalProject = activeTab?.data0 as Project | undefined;
            const isRestoreMode = selectedProject.id > 0 && originalProject?.deletedAt && !selectedProject.deletedAt;
            const token = $user.userToken;

            try {
                // ============================================================
                // Step 3: Prepare upsert data - use toLocalISOString to preserve local time
                // ============================================================
                const upsertData = {
                    id: isCreateMode ? 0 : selectedProject.id, // Always use 0 for create
                    name: selectedProject.name,
                    description: selectedProject.description,
                    status: selectedProject.status,
                    startDate: toLocalISOString(selectedProject.startDate),
                    endDate: toLocalISOString(selectedProject.endDate),
                    deletedAt: isRestoreMode ? null : undefined, // null = restore, undefined = don't touch,
                    workspaceId: selectedProject.workspaceId,
                };

                // ============================================================
                // Step 4: Call batch API to upsert project
                // ============================================================
                const result = await projectService._upsertProjectBatch(token, [upsertData]);
                if (!result.success) {
                    throw new Error(result.message || "Failed to save project");
                }

                // ============================================================
                // Step 6: Extract and validate saved project from response
                // ============================================================
                const savedProject = result && result.data && result.data.length > 0 ? result.data[0] : null;

                if (!savedProject) {
                    throw new Error("Failed to save project: No data returned from server");
                }

                // Transform DTO to domain model using parseAsLocalDate
                const transformedProject: Project = {
                    id: savedProject.id,
                    name: savedProject.name,
                    description: savedProject.description,
                    status: savedProject.status,
                    startDate: parseAsLocalDate(savedProject.startDate),
                    endDate: parseAsLocalDate(savedProject.endDate),
                    createdAt: parseAsLocalDate(savedProject.createdAt) || new Date(),
                    updatedAt: parseAsLocalDate(savedProject.updatedAt),
                    deletedAt: parseAsLocalDate(savedProject.deletedAt),
                    workspaceId: savedProject.workspaceId,
                };

                // ============================================================
                // Step 10: Update tab data and data0 with server response
                // ============================================================
                _console.success(isCreateMode ? "Project created successfully" : "Project saved successfully");
                if (tabId) {
                    setOpenTabs((prev) =>
                        prev.map((tab: BaseTab) => {
                            if (tab.id === tabId) {
                                return {
                                    ...tab,
                                    title: transformedProject.name || "Unsaved Project",
                                    data: transformedProject,
                                    data0: transformedProject, // Update data0 to new saved state
                                };
                            }
                            return tab;
                        })
                    );
                }

                // Reload projects immediately to show the newly saved project
                await loadProjects();

                return transformedProject;
            } catch (error) {
                console.error("Failed to save project:", error);
                const errorMessage = await parseApiError(error);

                if (isUnauthorizedError(error)) {
                    _console.error("Unauthorized. Please login again.");
                } else {
                    _console.error(`Failed to save project: ${errorMessage}`);
                }
                return null;
            }
        },
        [openTabs, activeTabId, loadProjects, $user, _console, setOpenTabs]
    );

    // Update inner tab in editor tab metadata
    const setActiveTab = useCallback((newTab: TabType) => {
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === tabId
                    ? { ...t, metadata: { ...t.metadata, innerTab: newTab } }
                    : t,
            ),
        );
    }, [tabId, setOpenTabs]);

    // Navigate to workspace view for this project
    const handleOpenWorkspace = useCallback(async () => {
        if (!selectedProject?.workspaceId) return;
        await saveNewsBeforeNavigate();
        setSelectedWorkspaceId(selectedProject.workspaceId);
        setModuleName(constants.modules.workspace);
    }, [selectedProject?.workspaceId, saveNewsBeforeNavigate, setSelectedWorkspaceId, setModuleName]);

    // Field-specific change handlers for ProjectGeneral form
    const handleStatusChange = useCallback((event: React.SyntheticEvent, newValue: { code: string } | null) => {
        if (newValue) {
            handleProjectFieldChange("status", newValue.code);
        }
    }, [handleProjectFieldChange]);

    const handleStartDateChange = useCallback((date: Date | null) => {
        handleProjectFieldChange("startDate", date);
    }, [handleProjectFieldChange]);

    const handleEndDateChange = useCallback((date: Date | null) => {
        handleProjectFieldChange("endDate", date);
    }, [handleProjectFieldChange]);

    const handleDescriptionChange = useCallback((value: string) => {
        handleProjectFieldChange("description", value);
    }, [handleProjectFieldChange]);

    const handleNameChange = useCallback((value: string, setNameError: (msg: string) => void) => {
        const trimmed = value.slice(0, 50);
        handleProjectFieldChange("name", trimmed.toUpperCase());
        if (trimmed && trimmed.trim() !== "") setNameError("");
        else setNameError("Project Name is required");
    }, [handleProjectFieldChange]);

    return {
        upsertProject,
        handleProjectFieldChange,
        setActiveTab,
        handleOpenWorkspace,
        handleStatusChange,
        handleStartDateChange,
        handleEndDateChange,
        handleDescriptionChange,
        handleNameChange,
    };
};
