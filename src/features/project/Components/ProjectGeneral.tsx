/**
 * Project Detail Tab Component
 * Two-column layout: Details (2/3) | Metadata (1/3)
 * Used in ProjectDetailContent as the first tab for editing project details
 * Pure UI — reads from selector, helper, headless. NO props.
 */


import { GenericTextField, StatusAutoComplete, RichTextEditor, DateRangePicker } from "@/shared";
import { CardContent } from "@/shared";
import { ScrollArea } from "@/shared";
import { useProjectDetailStore } from "../store/useProjectDetail.store";
import { useProjectDetailHelper } from "../hooks/useProjectDetail.helper";
import { useProjectDetailSelector } from "../Selectors/useProjectDetail.selector";
import { useProjectGeneralHeadless } from "../hooks/useProjectGeneral.headless";
import { formatDateTime } from "@/shared";
import { ProjectImagePicker } from "./ProjectImagePicker";
import { ProjectLinks } from "./small/ProjectLinks";

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
            <div className="px-6 py-2 mx-auto h-full pt-5">
                {/* Project Header */}
                <div className="mb-5 pb-4 border-b border-sa-border">
                    <h1 className="text-[22px] font-medium leading-tight text-foreground">
                        {selectedProject.name || "Untitled Project"}
                    </h1>
                    <p className="mt-1 font-mono text-[12px] text-muted-foreground">
                        {selectedProject.id > 0 ? `#${selectedProject.id}` : "New project"}
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
                                        label="Project name"
                                        value={selectedProject.name}
                                        onChange={(e) => handleNameChange(e.target.value, setNameError)}
                                        placeholder="Enter project name..."
                                        size="small"
                                        disabled={isDisabled}
                                        error={!!nameError}
                                        helperText={nameError || `${selectedProject.name?.length || 0}/50`}
                                        maxLength={50}
                                    />
                                </div>

                                {/* Due Date */}
                                <div className="flex-1">
                                    <DateRangePicker
                                        label="Due date"
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
                                    <label className="text-[11px] text-left font-medium uppercase tracking-wide text-muted-foreground">
                                        Description
                                    </label>
                                </div>
                                <div className="border border-sa-border rounded-xl overflow-hidden">
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
                                    <label className="text-[11px] text-left font-medium uppercase tracking-wide text-muted-foreground">
                                        Image
                                    </label>
                                    <ProjectImagePicker
                                        value={selectedProject.image ?? ""}
                                        onChange={handleImageChange}
                                    />
                                </div>

                            {/* Project Links — task #1477 */}
                            <ProjectLinks />

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
