/**
 * Project Detail Tab Component
 * Two-column layout: Details (2/3) | Metadata (1/3)
 * Used in ProjectDetailContent as the first tab for editing project details
 * Pure UI — reads from selector, helper, headless. NO props.
 */

import React from "react";
import { GenericTextField, StatusAutoComplete, RichTextEditor } from "@/shared/components";
import { DateRangePicker } from "@/shared/components/DateTimePicker";
import { CardContent } from "@/shared/components/ui/card";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { useProjectDetailStore } from "../store/useProjectDetail.store";
import { useProjectDetailHelper } from "../hooks/useProjectDetail.helper";
import { useProjectDetailSelector } from "../Selectors/useProjectDetail.selector";
import { useProjectGeneralHeadless } from "../HeadlessComponents/useProjectGeneral.headless";
import { formatDateTime } from "@/utils/formatters";
import { ProjectImagePicker } from "./ProjectImagePicker";

/**
 * ProjectGeneral
 * Form for editing project details
 * Gets data from selector — NO props.
 */
export function ProjectGeneral() {
    const { projectNameRef, nameError, setNameError } = useProjectDetailStore();

    // ── Computed values (from selector) ──────────────────
    const { selectedProject, statusOptions, currentStatusValue, isDisabled, isDeleted } = useProjectDetailSelector();

    // ── Handlers (from helper) ───────────────────────────
    const { handleNameChange, handleStatusChange, handleStartDateChange, handleEndDateChange, handleDescriptionChange, handleImageChange } = useProjectDetailHelper();

    // ── Side-effects (headless) ──────────────────────────
    const { projectKey } = useProjectGeneralHeadless();

    if (!selectedProject) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No project selected</p>
            </div>
        );
    }

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
                                        onChange={(e) => handleNameChange(e.target.value, setNameError)}
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
                        <CardContent className="space-y-3.5">

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
                                {/* Project Image */}
                                <div className="space-y-1 text-left mt-[-16px]">
                                    <label className="text-xs text-left font-semibold uppercase tracking-wider text-muted-foreground">
                                        Image
                                    </label>
                                    <ProjectImagePicker
                                        value={selectedProject.image ?? ""}
                                        onChange={handleImageChange}
                                    />
                                </div>

                            <p className="text-xs text-left text-muted-foreground leading-relaxed">
                                Created: {selectedProject.createdAt ? formatDateTime(selectedProject.createdAt) : "N/A"}
                                {selectedProject.updatedAt && <> · Updated: {formatDateTime(selectedProject.updatedAt)}</>}
                                {selectedProject.deletedAt && <> · Deleted: {formatDateTime(selectedProject.deletedAt)}</>}
                            </p>
                        </CardContent>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}
