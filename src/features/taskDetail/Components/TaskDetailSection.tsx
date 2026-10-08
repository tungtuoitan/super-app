import React, { useMemo } from "react";
import { Save, X, Star, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuiltinTab, SectionTab, useTaskDetailSectionStore } from "../store/useTaskDetailSection.store";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskSectionSelector } from "../Selectors/TaskSectionSelector";
import { useTaskSectionStore } from "../store/useTaskSection.store";
import { useTaskSectionHelper } from "../hooks/taskSection/useTaskSection.helper";
import { useTaskCustomTabSelector } from "../Selectors/TaskCustomTabSelector";
import { TaskProcess } from "./TaskProcess";
import { TaskChecklist } from "./TaskChecklist";
import { TaskComment } from "./TaskComment";
import { TaskChecklistProvider } from "../store/useTaskChecklist.store";
import { TaskCustomTab } from "./TaskCustomTab";
import { CommentFilterDropdown } from "./small/CommentFilterDropdown";
import { CustomTabButton } from "./small/CustomTabButton";
import { useTaskSectionHeadless } from "../hooks/taskSection/useTaskSection.headless";
import { RichTextEditor, ShadcnButton } from "@/shared";
import { BUILTIN_TABS } from "../task.constants";
import {TaskProcessProvider} from "../store/useTaskProcess.store";
import {TaskCommentProvider} from "../store/useTaskComment.store";

function  NewTaskPlaceholder() {
  return (
    <div className="flex h-[200px] items-center justify-center text-[13px] text-muted-foreground">
      Save the task first (Ctrl+S) to use this section.
    </div>
  );
}

function SectionNameList({ activeKey, onTabClick } : {activeKey: string, onTabClick: (key: SectionTab) => void }) {
  return (
    <>
      {BUILTIN_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeKey === tab.key;

        return (
          <button
            key={tab.key}
            onClick={() => onTabClick(tab.key)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium transition-colors duration-100",
              isActive
                ? "bg-sa-hover-strong text-foreground"
                : "text-muted-foreground hover:bg-sa-hover hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </>
  );
}

function SaveAndDiscard({
  onSave,
  onDiscard,
}: {
    onSave: () => void,
    onDiscard: () => void,

}) {
  return (
    <div className="absolute right-0 flex shrink-0 items-center gap-1 bg-background pl-2">
      <ShadcnButton size="sm" onClick={onSave} className="[&_svg]:size-3.5">
        <Save /> Save
      </ShadcnButton>

      <ShadcnButton size="sm" variant="ghost" onClick={onDiscard} className="text-muted-foreground [&_svg]:size-3.5">
        <X /> Discard
      </ShadcnButton>
    </div>
  );
}
export function TaskDetailSection() {
    const { activeSection } = useTaskDetailSectionStore();
    const { selectedTask, isDisabled } = useTaskDetailSelector();
    const { isSectionDirty } = useTaskSectionSelector();
    const { descKey, descFocusTrigger, commentFilter, commentShowDetail, setCommentFilter, setCommentShowDetail } = useTaskSectionStore();
    const { handleTabClick, handleAddCustomTab, handleSectionSave, handleSectionDiscard, handleDescChange } = useTaskSectionHelper();
    const { customTabs } = useTaskCustomTabSelector();
    useTaskSectionHeadless();

    const isNewTask = !selectedTask || selectedTask.id <= 0;

    const descContent = selectedTask?.description ?? ""

    if (!selectedTask) return null;

    return (
        <div className="flex flex-col h-full">

            {/* ── Tab Bar ── */}
            <div className="relative flex shrink-0 items-start gap-1 pb-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
                    <SectionNameList
                        activeKey={activeSection}
                        onTabClick={handleTabClick}
                    />
                    {customTabs.tabs.map((tab) => (
                        <CustomTabButton key={tab.id} tabId={tab.id} />
                    ))}

                    {!isDisabled && !isNewTask && (
                        <button
                            onClick={handleAddCustomTab}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground"
                            title="Add custom tab"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Right: Save/Discard or Filter */}
                {isSectionDirty && !isDisabled && (
                    <SaveAndDiscard 
                        onSave={handleSectionSave} 
                        onDiscard={handleSectionDiscard} 
                    />
                )}

                {activeSection === "comment" && !isSectionDirty && (
                    <div className="flex h-7 shrink-0 items-center">
                        <CommentFilterDropdown
                            value={commentFilter}
                            onChange={setCommentFilter}
                            showDetail={commentShowDetail}
                            onShowDetailChange={setCommentShowDetail}
                        />
                    </div>
                )}
            </div>

            {/* ── Section Panels ── */}
            <div className="flex-1 min-h-0">
                <TaskProcessProvider>
                    <div className={cn("h-full", activeSection !== "process" && "hidden")}>
                        {isNewTask ? <NewTaskPlaceholder /> : <TaskProcess />}
                    </div>
                </TaskProcessProvider>
                <TaskChecklistProvider>
                    <div className={cn("h-full", activeSection !== "checklist" && "hidden")}>
                        {isNewTask ? <NewTaskPlaceholder /> : <TaskChecklist />}
                    </div>
                </TaskChecklistProvider>
                <div className={cn("h-full", activeSection !== "desc" && "hidden")}>
                    <div className="h-full overflow-y-auto rounded-xl border border-sa-border">
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
                <TaskCommentProvider>
                    <div className={cn("h-full pt-1", activeSection !== "comment" && "hidden")}>
                        {isNewTask ? <NewTaskPlaceholder /> : <TaskComment />}
                    </div>
                </TaskCommentProvider>

                    {customTabs.tabs.map((tab) => (
                        <div key={tab.id} className={cn("h-full", activeSection !== `custom:${tab.id}` && "hidden")}>
                            {isNewTask ? <NewTaskPlaceholder /> : <TaskCustomTab tabId={tab.id} />}
                        </div>
                    ))}
                </div>
        </div>
    );
}
