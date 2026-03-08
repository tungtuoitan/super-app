/**
 * Project Detail Tab Component
 * Two-column layout: Details (2/3) | Metadata (1/3)
 * Used in ProjectDetailContent as the first tab for editing project details
 */

import React, { useEffect, useMemo } from "react";
import { GenericTextField, StatusAutoComplete, IStatusOption, RichTextEditor } from "@/shared/components";
import { DateRangePicker } from "@/shared/components/DateTimePicker";
import { CardContent } from "@/Components/ui/card";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { useProjectDetailStore } from "@/store/project/useProjectDetail.store";
import { useProjectDetailHelper } from "@/hooks/project/useProjectDetail.helper";
import { Project, useProjectStore } from "@/store/project/useProject.store";
import { useGeneralStore } from "@/store/general/General.store";
import { getProjectStatusColors } from "./ProjectStatusBadge";
import { constants } from "@/utils/index";
import { useEditorTabsStore } from "@/store/index";

interface ProjectDetailTabProps {
    projectId: number;
}

/**
 * ProjectGeneral
 * Form for editing project details
 */
export function ProjectGeneral({ projectId }: ProjectDetailTabProps) {
    const { projectNameRef, shouldFocusProjectName, setShouldFocusProjectName, nameError, setNameError } = useProjectDetailStore();
    const { handleProjectFieldChange } = useProjectDetailHelper();
    const { registriesByType } = useGeneralStore();
    const { openTabs } = useEditorTabsStore();

    // Get project from open tabs (to get latest data with unsaved changes)
    const selectedProject = useMemo(() => {
        const projectTab = openTabs.find(
            (tab) => tab.type === constants.vscode.tab.tabTypes.project && (tab.data as Project).id === projectId
        );
        return projectTab ? (projectTab.data as Project) : undefined;
    }, [openTabs, projectId]);

    const [projectKey, setProjectKey] = React.useState(0);
    useEffect(() => {
        if (selectedProject) {
            setProjectKey((prev) => prev + 1);
            setNameError(""); // Reset error when switching project
        }
    }, [selectedProject?.id]);

    // Focus on Project Name field when creating new project
    useEffect(() => {
        if (shouldFocusProjectName && projectNameRef.current) {
            setTimeout(() => {
                projectNameRef.current?.focus();
                setShouldFocusProjectName(false); // Reset flag after focus
            }, 100);
        }
    }, [shouldFocusProjectName, projectNameRef]);

    // Check if project is inactive (soft deleted, completed, or dropped)
    const isDeleted = selectedProject?.deletedAt !== null && selectedProject?.deletedAt !== undefined;
    const isCompleted = selectedProject?.status === "completed" || selectedProject?.status === "dropped";
    const isDisabled = isDeleted || isCompleted;

    const statusOptions: IStatusOption[] = useMemo(() => {
        const projectStatuses = registriesByType["project_status"] || [];

        return projectStatuses
            .map((reg) => {
                const colors = getProjectStatusColors(reg.code);
                return {
                    id: reg.code,
                    code: reg.code,
                    label: reg.description || reg.code,
                    bgColor: colors.bg,
                    textColor: colors.text,
                };
            })
            .sort((a, b) => (constants.optionOrder.projectStatuses[a.label] ?? 999) - (constants.optionOrder.projectStatuses[b.label] ?? 999));
    }, [registriesByType]);

    // Create current status value for autocomplete
    const currentStatusValue: IStatusOption | null = statusOptions.find((option) => option.code === selectedProject?.status) || null;

    // Handlers for form interactions
    const handleFieldChange = (field: keyof Project, value: any) => {
        handleProjectFieldChange(field, value);
    };

    const handleStatusChange = (event: React.SyntheticEvent, newValue: IStatusOption | null) => {
        if (newValue) {
            handleProjectFieldChange("status", newValue.code);
        }
    };

    // Date range handlers
    const handleStartDateChange = (date: Date | null) => {
        handleProjectFieldChange("startDate", date);
    };

    const handleEndDateChange = (date: Date | null) => {
        handleProjectFieldChange("endDate", date);
    };

    // Description change handler
    const handleDescriptionChange = (value: string) => {
        handleProjectFieldChange("description", value);
    };

    if (!selectedProject) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No project selected</p>
            </div>
        );
    }

    // Format date for display
    const formatDate = (date: Date | null | undefined): string => {
        if (!date) return "N/A";
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };

    return (
        <ScrollArea className="h-full w-full">
            <div className="px-6 py-2 mx-auto h-full pt-4">
                {/* Project Header - Large uppercase name */}
                <div className="mb-6 pb-4 border-b border-primary/20">
                    <h1 className="text-2xl font-bold uppercase tracking-wide text-primary">
                        {selectedProject.name || "Untitled Project"}
                    </h1>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                        Project ID: {selectedProject.id > 0 ? selectedProject.id : "New"}
                    </p>
                </div>

                {/* Two-column layout: Details (2/3) | Metadata (1/3) */}
                <div className="flex gap-6">
                    {/* Left Column - Project Details (2/3 width) */}
                    <div className="flex-[2] min-w-0">
                        <CardContent className="space-y-4">
                            {/* Project Name and Due Date on same row */}
                            <div className="flex gap-4 items-start">
                                {/* Project ID - fixed width */}
                                <div className="w-[80px] shrink-0">
                                    <GenericTextField label="ID" value={selectedProject.id > 0 ? selectedProject.id.toString() : "New"} disabled size="small" />
                                </div>

                                {/* Project Name - takes more space */}
                                <div className="flex-[2]">
                                    <GenericTextField
                                        ref={projectNameRef}
                                        label="PROJECT NAME"
                                        value={selectedProject.name}
                                        onChange={(e) => {
                                            const value = e.target.value.slice(0, 50); // Max 50 chars
                                            handleFieldChange("name", value.toUpperCase()); // Store as uppercase
                                            if (value && value.trim() !== "") setNameError("");
                                            else setNameError("Project Name is required");
                                        }}
                                        placeholder="Enter project name..."
                                        size="small"
                                        disabled={isDisabled}
                                        error={!!nameError}
                                        helperText={nameError || `${selectedProject.name?.length || 0}/50`}
                                        maxLength={50}
                                        className="uppercase"
                                    />
                                </div>

                                {/* Due Date */}
                                <div className="flex-1">
                                    <DateRangePicker
                                        label="DUE DATE"
                                        startDate={selectedProject.startDate}
                                        endDate={selectedProject.endDate}
                                        onStartDateChange={handleStartDateChange}
                                        onEndDateChange={handleEndDateChange}
                                        disabled={isDisabled}
                                        placeholder="Set due dates..."
                                    />
                                </div>
                            </div>

                            {/* Description - RichText Editor */}
                            <div className="space-y-2 text-left">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-left font-semibold uppercase tracking-wider text-muted-foreground">
                                        Description
                                    </label>
                                </div>
                                <div className="border rounded-md overflow-hidden">
                                    <RichTextEditor
                                        key={`description-${projectKey}`}
                                        value={selectedProject.description || ""}
                                        onChange={handleDescriptionChange}
                                        placeholder="Enter project description..."
                                        disabled={isDisabled}
                                        minHeight="300px"
                                        uploadContext="project"
                                        uploadContextId={selectedProject.id > 0 ? selectedProject.id : undefined}
                                    />

                                </div>
                            </div>
                        </CardContent>
                    </div>

                    {/* Right Column - Metadata (1/3 width) */}
                    <div className="flex-1 min-w-0">
                        <CardContent className="space-y-7">
                            {/* Project Status - moved to right column */}
                            <StatusAutoComplete
                                value={currentStatusValue}
                                onChange={handleStatusChange}
                                options={statusOptions}
                                inputProps={{
                                    name: "status",
                                    label: "Status",
                                }}
                                disabled={isDeleted}
                                placeholder="Select status..."
                            />

                            <p className="text-xs text-left text-muted-foreground leading-relaxed">
                                Created: {formatDate(selectedProject.createdAt)}
                                {selectedProject.updatedAt && <> · Updated: {formatDate(selectedProject.updatedAt)}</>}
                                {selectedProject.deletedAt && <> · Deleted: {formatDate(selectedProject.deletedAt)}</>}
                            </p>
                        </CardContent>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}
