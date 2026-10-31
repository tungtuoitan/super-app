/**
 * ProjectHero — the top of the project General page (cover layout): cover image, id, editable name and
 * a row of pill chips (status, due date, "+ Link", created). When the project has links, the link list
 * sits at the right of the hero. Pure UI — reads from selector, helpers and stores. NO props.
 */

import { CalendarDays, Plus } from "lucide-react";
import { GenericTextField, StatusAutoComplete, DateRangePicker, formatDateTime } from "@/shared";
import { PropertyChip } from "@/features/taskDetail";
import { useProjectDetailStore } from "../../store/useProjectDetail.store";
import { useProjectLinksStore } from "../../store/useProjectLinks.store";
import { useProjectDetailHelper } from "../../hooks/useProjectDetail.helper";
import { useProjectLinksHelper } from "../../hooks/useProjectLinks.helper";
import { useProjectLinksHeadless } from "../../hooks/useProjectLinks.headless";
import { useProjectDetailSelector } from "../../Selectors/useProjectDetail.selector";
import { ProjectImagePicker } from "../ProjectImagePicker";
import { ProjectLinks } from "./ProjectLinks";

const PILL = "rounded-full border border-sa-border [&_button]:rounded-full";

export function ProjectHero() {
    const { projectNameRef, nameError, setNameError } = useProjectDetailStore();
    const { projectLinks } = useProjectLinksStore();
    const { selectedProject, statusOptions, currentStatusValue, isDisabled, isDeleted } = useProjectDetailSelector();
    const { handleNameChange, handleStatusChange, handleStartDateChange, handleEndDateChange, handleImageChange } = useProjectDetailHelper();
    const { addProjectLink } = useProjectLinksHelper();
    useProjectLinksHeadless();

    if (!selectedProject) return null;

    const canAddLink = selectedProject.id > 0 && !isDeleted && !!selectedProject.workspaceId;

    return (
        <div className="flex items-center gap-7 pb-6">
            <div className="w-[148px] shrink-0">
                <ProjectImagePicker value={selectedProject.image ?? ""} onChange={handleImageChange} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3 text-left">
                <div className="space-y-0.5">
                    <p className="font-mono text-[12px] text-muted-foreground">
                        {selectedProject.id > 0 ? `#${selectedProject.id}` : "New project"}
                    </p>
                    <GenericTextField
                        ref={projectNameRef}
                        value={selectedProject.name}
                        onChange={(e) => handleNameChange(e.target.value, setNameError)}
                        placeholder="Enter project name..."
                        aria-label="Project name"
                        size="small"
                        disabled={isDisabled}
                        error={!!nameError}
                        maxLength={50}
                        className="-mx-1.5 h-11 border-transparent bg-transparent px-1.5 text-[30px] font-semibold tracking-tight shadow-none outline-none hover:border-transparent focus:border-transparent focus:ring-0 focus-visible:border-transparent focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
                    />
                    {nameError && <p className="text-xs text-sa-danger">{nameError}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <PropertyChip title="Status" className={PILL}>
                        <StatusAutoComplete
                            value={currentStatusValue}
                            onChange={handleStatusChange}
                            options={statusOptions}
                            inputProps={{ name: "status" }}
                            disabled={isDeleted}
                            placeholder="Status"
                            width="auto"
                        />
                    </PropertyChip>

                    <PropertyChip title="Due date" icon={<CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />} className={PILL}>
                        <DateRangePicker
                            startDate={selectedProject.startDate}
                            endDate={selectedProject.endDate}
                            onStartDateChange={handleStartDateChange}
                            onEndDateChange={handleEndDateChange}
                            placeholder="Due date"
                            disabled={isDisabled}
                            showTime={false}
                            compact
                        />
                    </PropertyChip>

                    {canAddLink && (
                        <button
                            onClick={() => addProjectLink(selectedProject.id)}
                            className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-sa-border-strong px-3 text-[13px] text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground"
                            title="Add link (URL, GitHub, Drive…)"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Link
                        </button>
                    )}

                    <span
                        className="ml-1 text-xs text-muted-foreground"
                        title={selectedProject.updatedAt ? `Updated ${formatDateTime(selectedProject.updatedAt)}` : undefined}
                    >
                        Created {selectedProject.createdAt ? formatDateTime(selectedProject.createdAt) : "N/A"}
                        {selectedProject.deletedAt && <> · Deleted {formatDateTime(selectedProject.deletedAt)}</>}
                    </span>
                </div>
            </div>

            {projectLinks.length > 0 && (
                <div className="w-[260px] shrink-0 self-stretch border-l border-sa-border pl-6 text-left">
                    <ProjectLinks />
                </div>
            )}
        </div>
    );
}
