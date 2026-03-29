import React, { useMemo } from "react";
import { Save, X, Star, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskDetailSectionStore } from "@/store/task/useTaskDetailSection.store";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { useTaskChecklistStore } from "@/store/task/useTaskChecklist.store";
import { useTaskChecklistHelper } from "@/hooks/task/useTaskChecklist.helper";
import { useTaskSectionSelector } from "@/Selectors/task/TaskSectionSelector";
import { useTaskSectionStore } from "@/store/task/useTaskSection.store";
import { useTaskSectionHelper } from "@/hooks/task/useTaskSection.helper";
import { useTaskCustomTabSelector } from "@/Selectors/task/TaskCustomTabSelector";
import { isCustomTab } from "@/utils/task/taskDetailSection.utils";
import { TaskProcess } from "./TaskProcess";
import { TaskChecklist } from "./TaskChecklist";
import { TaskComment } from "./TaskComment";
import { TaskCustomTab } from "./TaskCustomTab";
import { CommentFilterDropdown } from "./small/CommentFilterDropdown";
import { CustomTabButton } from "./small/CustomTabButton";
import { NewTaskPlaceholder } from "./small/NewTaskPlaceholder";
import { TaskSectionHeadless } from "@/HeadlessComponents/task/TaskSectionHeadless";
import { RichTextEditor } from "@/shared/components";
import { BUILTIN_TABS, TAB_COLORS } from "@/types/task/taskDetailSection.constants";

export function TaskDetailSection() {
    const { activeSection } = useTaskDetailSectionStore();
    const { selectedTask, isDisabled } = useTaskDetailSelector();
    const { isChecklistEditing, settingDefault } = useTaskChecklistStore();
    const { handleSetAsDefault } = useTaskChecklistHelper();
    const { isSectionDirty } = useTaskSectionSelector();
    const { descKey, descFocusTrigger, commentFilter, commentShowDetail, setCommentFilter, setCommentShowDetail } = useTaskSectionStore();
    const { handleTabClick, handleAddCustomTab, handleSectionSave, handleSectionDiscard, handleDescChange } = useTaskSectionHelper();
    const { customTabs } = useTaskCustomTabSelector();

    const isNewTask = !selectedTask || selectedTask.id <= 0;

    const descContent = useMemo(() => selectedTask?.note ?? "", [selectedTask?.note]);

    if (!selectedTask) return null;

    return (
        <div className="flex flex-col h-full">
            <TaskSectionHeadless />

            {/* ── Tab Bar ── */}
            <div className="flex items-start shrink-0 gap-1 relative">
                <div className="flex flex-wrap items-center min-w-0 flex-1">
                    {BUILTIN_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeSection === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => handleTabClick(tab.key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                                    isActive ? TAB_COLORS[tab.key].active : "border-transparent text-muted-foreground hover:text-foreground",
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}

                    {customTabs.tabs.map((tab) => (
                        <CustomTabButton key={tab.id} tabId={tab.id} />
                    ))}

                    {!isDisabled && !isNewTask && (
                        <button
                            onClick={handleAddCustomTab}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            title="Add custom tab"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Right: Save/Discard or Filter */}
                {isSectionDirty && !isDisabled && (
                    <div className="absolute right-0 flex items-center gap-1.5 pr-1 shrink-0 py-1 bg-background">
                        <button
                            onClick={handleSectionSave}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            <Save className="h-3 w-3" /> Save
                        </button>
                        {activeSection === "checklist" && isChecklistEditing && (
                            <button
                                onClick={handleSetAsDefault}
                                disabled={settingDefault}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                                title="Save as default template for this task type"
                            >
                                <Star className="h-3 w-3" />
                                {settingDefault ? "Saving…" : "Default"}
                            </button>
                        )}
                        <button
                            onClick={handleSectionDiscard}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                        >
                            <X className="h-3 w-3" /> Discard
                        </button>
                    </div>
                )}

                {/* {activeSection === "comment" && !isSectionDirty && (
                    <div className="shrink-0 py-1">
                        <CommentFilterDropdown
                            value={commentFilter}
                            onChange={setCommentFilter}
                            showDetail={commentShowDetail}
                            onShowDetailChange={setCommentShowDetail}
                        />
                    </div>
                )} */}
            </div>

            {/* ── Section Panels ── */}
            <div className="flex-1 min-h-0">
                <div className={cn("h-full", activeSection !== "process" && "hidden")}>
                    {isNewTask ? <NewTaskPlaceholder /> : <TaskProcess />}
                </div>
                <div className={cn("h-full", activeSection !== "checklist" && "hidden")}>
                    {isNewTask ? <NewTaskPlaceholder /> : <TaskChecklist />}
                </div>
                <div className={cn("h-full pt-2.5", activeSection !== "desc" && "hidden")}>
                    <div className="h-full overflow-y-auto border rounded-md">
                        <RichTextEditor
                            key={`note-${descKey}`}
                            value={descContent}
                            onChange={handleDescChange}
                            placeholder="Enter task description..."
                            minHeight="580px"
                            className="text-left"
                            disabled={isDisabled || isNewTask}
                            focusTrigger={descFocusTrigger}
                            uploadContext="project"
                            uploadContextId={selectedTask.projectId}
                        />
                    </div>
                </div>
                <div className={cn("h-full mt-2.5 border-t pt-4", activeSection !== "comment" && "hidden")}>
                    {isNewTask ? <NewTaskPlaceholder /> : <></>}
                    {/* {isNewTask ? <NewTaskPlaceholder /> : <TaskComment />} */}
                </div>

                {customTabs.tabs.map((tab) => (
                    <div key={tab.id} className={cn("h-full", activeSection !== `custom:${tab.id}` && "hidden")}>
                        {isNewTask ? <NewTaskPlaceholder /> : <TaskCustomTab tabId={tab.id} />}
                    </div>
                ))}
            </div>
        </div>
    );
}
