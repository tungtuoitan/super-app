/**
 * LogEditorPanel - Editor tab wrapper for a LifeLog Log
 */

import { useLogEditorPanelHeadless } from "@/HeadlessComponents/lifeLog/useLogEditorPanel.headless";
import { LogDetailContent } from "./LogDetailContent";

export function LogEditorPanel() {
    useLogEditorPanelHeadless();

    return (
        <div className="flex-1 flex flex-col bg-editor-bg overflow-hidden">
            <LogDetailContent />
        </div>
    );
}
