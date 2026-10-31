/**
 * TaskReflect — the Reflect tab of a task. The sheet itself is shared (ReflectSheet); this file only
 * connects it to the task's rows. Changes light up the section Save button (Ctrl+S when only this
 * section is dirty); a row cleared completely is dropped on save.
 */

import { ReflectSheet } from "./small/ReflectSheet";
import { useTaskReflectHelper } from "../hooks/taskReflect/useTaskReflect.helper";
import { useTaskReflectHeadless } from "../hooks/taskReflect/useTaskReflect.headless";

export function TaskReflect() {
    const { rows, isDirty, isDisabled, typeOptions, activeSection, handleFieldChange, handleAddRow, save, discard } = useTaskReflectHelper();
    useTaskReflectHeadless({ isDirty, save, discard });

    return (
        <ReflectSheet
            rows={rows}
            isDisabled={isDisabled}
            typeOptions={typeOptions}
            onFieldChange={handleFieldChange}
            onAddRow={handleAddRow}
            regrowKey={activeSection}
        />
    );
}
