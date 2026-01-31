/**
 * Project Detail Dialog Content Component
 * Two-column layout: Details (2/3) | Metadata (1/3)
 */

import React, { useEffect, useMemo } from "react";
import { GenericTextField, StatusAutoComplete, IStatusOption } from "@/shared/components";
import { CardContent } from "@/Components/ui/card";
import { Textarea } from "@/Components/ui/textarea";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { FileText } from "lucide-react";
import { useProjectDetailStore } from "@/store/project/useProjectDetail.store";
import { useProjectDetailHelper } from "@/hooks/project/useProjectDetail.helper";
import { Project } from "@/store/project/useProject.store";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { useGeneralStore } from "@/store/general/General.store";
import { getProjectStatusColors } from "./ProjectStatusBadge";

/**
 * Project Detail Dialog Content
 * Form for editing project details
 */
export function ProjectDetailContent() {
    const { projectNameRef, shouldFocusProjectName, setShouldFocusProjectName, nameError, setNameError } = useProjectDetailStore();
    const { handleProjectFieldChange } = useProjectDetailHelper();
    const { getActiveTab } = useEditorTabHelper();
    const { registriesByType } = useGeneralStore();

    // Get active tab
    const activeTab = getActiveTab();
    const selectedProject = activeTab?.data as Project | undefined;

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

    // Check if project is inactive (soft deleted)
    const isDeleted = selectedProject?.deletedAt !== null && selectedProject?.deletedAt !== undefined;

    // Get status options from registriesByType with colors
    const STATUS_ORDER: Record<string, number> = {
        "Open": 1,
        "In Progress": 2,
        "Completed": 3,
    };

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
            .sort((a, b) => (STATUS_ORDER[a.label] ?? 999) - (STATUS_ORDER[b.label] ?? 999));
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
            <div className="px-6 py-2 mx-auto h-full">
                {/* Two-column layout: Details (2/3) | Metadata (1/3) */}
                <div className="flex gap-6">
                    {/* Left Column - Project Details (2/3 width) */}
                    <div className="flex-[2] min-w-0">
                        <CardContent className="space-y-4">
                            {/* Project Status with colored options */}
                            <div className="w-full flex ">
                                <StatusAutoComplete
                                    value={currentStatusValue}
                                    onChange={handleStatusChange}
                                    options={statusOptions}
                                    inputProps={{
                                        name: "status",
                                        label: "Status",
                                    }}
                                    // size="tiny"
                                    disabled={isDeleted}
                                    placeholder="Select status..."
                                />
                            </div>
                            {/* Project Name */}
                            <GenericTextField
                                ref={projectNameRef}
                                label="Project Name"
                                value={selectedProject.name}
                                onChange={(e) => {
                                    const value = e.target.value.slice(0, 50); // Max 50 chars
                                    handleFieldChange("name", value);
                                    if (value && value.trim() !== "") setNameError("");
                                    else setNameError("Project Name is required");
                                }}
                                placeholder="Enter project name..."
                                size="small"
                                disabled={isDeleted}
                                error={!!nameError}
                                helperText={nameError || `${selectedProject.name?.length || 0}/50`}
                                maxLength={50}
                            />

                            

                            {/* Description - Takes more space */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Description
                                </label>
                                <Textarea
                                    key={`description-${projectKey}`}
                                    value={selectedProject.description || ""}
                                    onChange={(e) => handleFieldChange("description", e.target.value)}
                                    placeholder="Enter project description..."
                                    className="min-h-[300px] resize-y"
                                    disabled={isDeleted}
                                />
                            </div>
                        </CardContent>
                    </div>

                    {/* Right Column - Metadata (1/3 width) */}
                    <div className="flex-1 min-w-0">
                        <CardContent className="space-y-7">
                            <GenericTextField label="Project ID" value={selectedProject.id > 0 ? selectedProject.id.toString() : "New (Unsaved)"} disabled size="small" />

                            <GenericTextField label="Created At" value={formatDate(selectedProject.createdAt)} disabled size="small" />

                            {selectedProject.updatedAt && <GenericTextField label="Updated At" value={formatDate(selectedProject.updatedAt)} disabled size="small" />}

                            {selectedProject.deletedAt && <GenericTextField label="Deleted At" value={formatDate(selectedProject.deletedAt)} disabled size="small" />}
                        </CardContent>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}
