/**
 * Project Grid Helper Hook
 * Business logic for project grid operations
 */

import { projectService, ProjectDTO } from "../service/project.service";
import { Project, useProjectStore } from "../store/useProject.store";
import { collectIdsFromTabs, generateTempId, generateUnsavedName } from "@/utils/index";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { useConsoleHelper } from "@/hooks/console/useConsole.helper";
import { useProjectTabHelper } from "./useProjectTab.helper";
import { useProjectDetailStore } from "../store/useProjectDetail.store";
import { parseAsLocalDate } from "@/utils/date.utils";
import { useEditorTabsStore } from "@/store/index";
import { constants } from "@/utils/constants";
import type { BaseTab } from "@/types/editor/tab.types";

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
        image: dto.image,
    }));
};

export const useProjectGridHelper = () => {
    const { $user } = useAuthStore();
    const {
        projects,
        setProjects,
        setProjectGridIsLoading,
        setProjectGridError,
        projectGridRowSelection,
        setProjectGridRowSelection,
        setTotalCount,
    } = useProjectStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const _console = useConsoleHelper();
    const { openProjectTab, openMultiProjectTab } = useProjectTabHelper();
    const { setShouldFocusProjectName } = useProjectDetailStore();
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabsStore();

    // Create new project (temporary with negative ID) and open tab
    const __createNewProject = () => {
        // Generate sequential temporary negative ID
        const existingIds = projects.map((p) => p.id);
        const tempId = generateTempId(existingIds);
        const name = generateUnsavedName(tempId);

        // Create temporary project
        const newProject: Project = {
            id: tempId,
            name: name,
            description: "",
            status: "active",
            startDate: null,
            endDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
        };

        // Insert at the beginning of projects array
        setProjects([newProject, ...projects]);

        // Open project tab for editing
        openProjectTab(newProject);

        // Focus on project name field
        setShouldFocusProjectName(true);

        _console.success(`Created new project: ${name}`);
    };

    /**
     * Toggle delete/restore for selected projects (soft delete)
     */
    const __deleteRestore_Projects = async (ids?: number[], type: "soft-delete" | "restore" = "soft-delete") => {
        const selectedIds = ids ?? Object.keys(projectGridRowSelection).map((id) => parseInt(id));
        if (selectedIds.length === 0) return;

        const tempProjectIds = selectedIds.filter((id) => id < 0);
        const persistedProjectIds = selectedIds.filter((id) => id > 0);

        try {
            const token = $user.userToken;

            // Handle temporary projects - only for delete (remove from grid locally)
            if (type === "soft-delete" && tempProjectIds.length > 0) {
                setProjects((prev) => prev.filter((p) => !tempProjectIds.includes(p.id)));
                _console.success(`Removed ${tempProjectIds.length} unsaved project(s)`);
            }

            // Handle persisted projects - call API
            if (persistedProjectIds.length > 0) {
                const deletedAt = type === "soft-delete" ? new Date().toISOString() : null;

                const batchRequests = persistedProjectIds.map((id) => {
                    const project = projects.find((p) => p.id === id);
                    if (!project) {
                        throw new Error(`Project ${id} not found`);
                    }

                    return {
                        id: project.id,
                        name: project.name,
                        description: project.description,
                        status: project.status,
                        deletedAt: deletedAt,
                    };
                });

                const result = await projectService._upsertProjectBatch(token, batchRequests);

                if (!result.success) {
                    throw new Error(result.message || `Failed to ${type === "soft-delete" ? "delete" : "restore"} projects`);
                }

                _console.success(`Successfully ${type === "soft-delete" ? "soft deleted" : "restored"} ${persistedProjectIds.length} project(s)`);

                // Reload projects from API
                await loadProjects();
            }

            // Clear selection
            setProjectGridRowSelection({});
        } catch (error) {
            console.error(`Failed to ${type === "soft-delete" ? "delete" : "restore"} projects:`, error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to ${type === "soft-delete" ? "delete" : "restore"} projects: ${errorMessage}`);
            }
        }
    };

    // Handle context menu
    const openProjectContextMenu = (event: React.MouseEvent, row?: any) => {
        event.preventDefault();
        event.stopPropagation();

        let selectedIds = Object.keys(projectGridRowSelection).map((id) => parseInt(id));

        // If no selection and row provided, use the hovered row
        if (selectedIds.length === 0 && row) {
            selectedIds = [parseInt(row.id)];
        }

        const selectedProjects = [...projects]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .filter((p) => selectedIds.includes(p.id));

        showContextMenu(event, "project-grid", {
            selectedProjects,
            selectedIds,
            onSoftDelete: () => __deleteRestore_Projects(selectedIds, "soft-delete"),
            onRestore: () => __deleteRestore_Projects(selectedIds, "restore"),
            onAddProject: __createNewProject,
            onOpenMultiProjectView: () => {
                // Open multi-project tab - it will use its own chip selector to choose projects
                // Default will be all active projects (handled in MultiProjectDetailContent)
                openMultiProjectTab([]);
            },
            onOpenProjectView: () => {
                if (selectedProjects.length === 1) {
                    openProjectTab(selectedProjects[0]);
                }
            },
        });
    };

    // Load projects with filters
    const loadProjects = async () => {
        try {
            setProjectGridIsLoading(true);
            const token = $user.userToken;

            const projectGridFilters = $user.filters?.projectGrid;

            const filterParams: {
                deletedAt?: string;
                status?: string;
            } = {
                deletedAt: projectGridFilters?.deletedAt ?? "null",
                status: projectGridFilters?.statusCode ?? "active",
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

    return {
        openProjectContextMenu,
        loadProjects,
        createNewProject: __createNewProject,
    };
};
