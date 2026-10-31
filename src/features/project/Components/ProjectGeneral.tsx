/**
 * Project General page — cover layout:
 * hero (image, name, status, due date, links) on top, then underline tabs "Description | Reflect"
 * over a full-width content area. The Save / Discard bar (with its Saved / Discarded confirmation)
 * sits at the right of the tab row while the Reflect rows have unsaved changes.
 * Pure UI — reads from selector, helpers and headless. NO props.
 */

import { useState } from "react";
import { RichTextEditor, ScrollArea } from "@/shared";
import { ReflectSheet, SectionSaveBar, countReflectRows } from "@/features/taskDetail";
import { cn } from "@/lib/utils";
import { useProjectDetailHelper } from "../hooks/useProjectDetail.helper";
import { useProjectDetailSelector } from "../Selectors/useProjectDetail.selector";
import { useProjectGeneralHeadless } from "../hooks/useProjectGeneral.headless";
import { useProjectReflectHelper } from "../hooks/useProjectReflect.helper";
import { useProjectReflectHeadless } from "../hooks/useProjectReflect.headless";
import { ProjectHero } from "./small/ProjectHero";

type GeneralSection = "description" | "reflect";

const TAB = "relative flex h-9 items-center gap-1.5 border-b-2 px-0.5 text-[13px] transition-colors duration-100";

export function ProjectGeneral() {
    const { selectedProject, isDisabled } = useProjectDetailSelector();
    const { handleDescriptionChange } = useProjectDetailHelper();
    const { projectKey } = useProjectGeneralHeadless();
    const reflect = useProjectReflectHelper();
    useProjectReflectHeadless({ isDirty: reflect.isDirty, hasProjectChanges: reflect.hasProjectChanges, save: reflect.save, discard: reflect.discard });
    const [section, setSection] = useState<GeneralSection>("description");

    if (!selectedProject) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No project selected</p>
            </div>
        );
    }

    const showSaveBar = section === "reflect" && (reflect.isDirty || reflect.feedback) && !reflect.isDisabled;

    return (
        <ScrollArea className="h-full w-full">
            <div className="mx-auto max-w-[1100px] px-6 pb-8 pt-6">
                <ProjectHero />

                {/* Section tabs */}
                <div className="relative flex items-end gap-6 border-b border-sa-border">
                    <button
                        onClick={() => setSection("description")}
                        className={cn(TAB, section === "description" ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
                    >
                        Description
                    </button>
                    <button
                        onClick={() => setSection("reflect")}
                        className={cn(TAB, section === "reflect" ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
                    >
                        Reflect
                        <span className="text-xs font-normal text-muted-foreground">{countReflectRows(reflect.rows)}</span>
                        {reflect.isDirty && section !== "reflect" && <span className="h-1.5 w-1.5 rounded-full bg-sa-amber" aria-label="Unsaved changes" />}
                    </button>
                    {reflect.isNewProject && section === "reflect" && (
                        <span className="pb-2 text-xs text-muted-foreground">Save the project first to use Reflect.</span>
                    )}
                    {showSaveBar && (
                        <div className="absolute bottom-1.5 right-0 h-7 w-0">
                            <SectionSaveBar onSave={reflect.save} onDiscard={reflect.discard} feedback={reflect.isDirty ? null : reflect.feedback} onFeedbackDone={reflect.clearFeedback} />
                        </div>
                    )}
                </div>

                <div className="pt-4 text-left">
                    {section === "description" ? (
                        <div className="overflow-hidden rounded-xl border border-sa-border">
                            <RichTextEditor
                                key={`description-${projectKey}`}
                                value={selectedProject.description || ""}
                                onChange={handleDescriptionChange}
                                placeholder="Enter project description..."
                                disabled={isDisabled}
                                minHeight="360px"
                                uploadContext="project"
                                uploadContextId={selectedProject.id > 0 ? selectedProject.id : undefined}
                            />
                        </div>
                    ) : (
                        <ReflectSheet
                            rows={reflect.rows}
                            isDisabled={reflect.isDisabled}
                            typeOptions={reflect.typeOptions}
                            onFieldChange={reflect.handleFieldChange}
                            onAddRow={reflect.handleAddRow}
                            regrowKey="project-reflect"
                        />
                    )}
                </div>
            </div>
        </ScrollArea>
    );
}
