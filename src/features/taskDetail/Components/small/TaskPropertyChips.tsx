/**
 * TaskPropertyChips — Linear-style row of property chips under the task title (#1514).
 * Status · Priority · Type · Dates · Project · Parent · Milestone.
 * Each chip wraps the existing shared control (same value/onChange/disabled as before);
 * only the trigger is restyled by PropertyChip.
 */

import { CalendarDays, CornerLeftUp, Diamond, FolderKanban } from "lucide-react";
import { StatusAutoComplete, DateRangePicker, GenericAutoComplete, Checkbox, getDateTone } from "@/shared";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskDetailFormSelector } from "../../Selectors/TaskDetailFormSelector";
import { useTaskDetailFormHelper } from "../../hooks/useTaskDetailForm.helper";
import { useTaskDetailStore } from "../../store/useTaskDetail.store";
import { PropertyChip } from "./PropertyChip";

const chipIconClass = "h-3.5 w-3.5 shrink-0 text-muted-foreground";

export function TaskPropertyChips() {
    const {
        selectedTask,
        isDeleted,
        isDisabled,
        hasSubtasks,
        statusOptions,
        priorityOptions,
        taskTypeOptions,
        currentStatusValue,
        currentPriorityValue,
        currentTaskTypeValue,
        limitDates,
    } = useTaskDetailSelector();
    const { currentProjectValue, currentParentTaskValue } = useTaskDetailFormSelector();
    const { projectOptions, isLoadingProjects, parentTaskOptions, isLoadingParentTasks } = useTaskDetailStore();
    const {
        handleFieldChange,
        handleStatusChange,
        handlePriorityChange,
        handleTaskTypeChange,
        handleProjectChange,
        handleParentTaskChange,
    } = useTaskDetailFormHelper();

    if (!selectedTask) return null;

    const dateTone = getDateTone(selectedTask.endDate, selectedTask.status);

    return (
        <div className="flex flex-wrap items-center gap-1">
            <PropertyChip title="Status">
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

            <PropertyChip title="Priority">
                <StatusAutoComplete
                    value={currentPriorityValue}
                    onChange={handlePriorityChange}
                    options={priorityOptions}
                    inputProps={{ name: "priority" }}
                    disabled={isDisabled}
                    placeholder="Priority"
                    width="auto"
                />
            </PropertyChip>

            <PropertyChip title="Task type">
                <StatusAutoComplete
                    value={currentTaskTypeValue}
                    onChange={handleTaskTypeChange}
                    options={taskTypeOptions}
                    inputProps={{ name: "taskType" }}
                    disabled={isDisabled}
                    placeholder="Type"
                    width="auto"
                />
            </PropertyChip>

            <PropertyChip title="Date range" icon={<CalendarDays className={chipIconClass} />}>
                <DateRangePicker
                    startDate={selectedTask.startDate}
                    endDate={selectedTask.endDate}
                    onStartDateChange={(date: Date | null) => handleFieldChange("startDate", date)}
                    onEndDateChange={(date: Date | null) => handleFieldChange("endDate", date)}
                    placeholder="Dates"
                    disabled={isDisabled}
                    showTime={false}
                    limitStartDate={limitDates.limitStartDate}
                    limitEndDate={limitDates.limitEndDate}
                    compact
                    compactTone={dateTone}
                />
            </PropertyChip>

            <PropertyChip
                title={isLoadingProjects ? "Project (loading...)" : "Project"}
                icon={<FolderKanban className={chipIconClass} />}
            >
                <GenericAutoComplete
                    value={currentProjectValue}
                    onChange={handleProjectChange}
                    allOptions={projectOptions}
                    inputProps={{ name: "project", label: "", placeholder: "No project" }}
                    disabled={isDisabled || isLoadingProjects}
                    disableClearable
                    className="w-auto"
                />
            </PropertyChip>

            <PropertyChip
                title={hasSubtasks ? "Parent task — has subtasks, cannot be a subtask" : "Parent task (subtask of)"}
                icon={<CornerLeftUp className={chipIconClass} />}
            >
                <GenericAutoComplete
                    value={currentParentTaskValue}
                    onChange={handleParentTaskChange}
                    allOptions={parentTaskOptions}
                    inputProps={{ name: "parentTask", label: "", placeholder: "No parent" }}
                    disabled={isDisabled || isLoadingParentTasks || hasSubtasks}
                    className="w-auto"
                />
            </PropertyChip>

            <label
                className="inline-flex h-7 cursor-pointer select-none items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors duration-100 hover:bg-sa-hover has-[[data-state=checked]]:text-foreground"
                title="Milestone"
            >
                <Checkbox
                    checked={!!selectedTask.isMilestone}
                    onCheckedChange={(v) => handleFieldChange("isMilestone", v === true)}
                    disabled={isDisabled}
                />
                <Diamond className="h-3.5 w-3.5 text-sa-amber" />
                Milestone
            </label>
        </div>
    );
}
