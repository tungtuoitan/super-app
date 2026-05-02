/**
 * MultiProjectTaskFlowView — Task dependency visualiser using React Flow.
 * Scroll=pan, Shift+scroll=horizontal, Ctrl+scroll=zoom.
 */

import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MultiTaskFlowProvider } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { TaskFlowCanvas } from "./small/TaskFlowCanvas";

export function MultiProjectTaskFlowView() {
    return (
        <MultiTaskFlowProvider>
            <ReactFlowProvider>
                <TaskFlowCanvas />
            </ReactFlowProvider>
        </MultiTaskFlowProvider>
    );
}
