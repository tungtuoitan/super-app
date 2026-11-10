/**
 * ReflectView — sidebar of the Reflect module. Opens the journal tab as soon as the module is picked
 * (and again from the button if the tab was closed).
 */

import { useEffect, useRef } from "react";
import { NotebookPen } from "lucide-react";
import { shellConstants, useEditorTabBarHelper } from "@/shell";
import { reflectConstants } from "../reflect.constants";

export function ReflectView() {
    const { openSingletonTab } = useEditorTabBarHelper();

    const openJournal = () =>
        openSingletonTab(shellConstants.vscode.tab.tabTypes.reflect, { title: reflectConstants.tabTitle, tabId: reflectConstants.tabId });

    // Only when the module is picked (the first render's function is enough)
    const openOnPick = useRef(openJournal);
    useEffect(() => openOnPick.current(), []);

    return (
        <div className="flex h-full flex-col gap-1 p-2">
            <button
                onClick={openJournal}
                className="flex h-8 items-center gap-2 rounded-md px-2 text-[13px] text-foreground transition-colors duration-100 hover:bg-sa-hover"
            >
                <NotebookPen className="h-4 w-4" style={{ color: reflectConstants.color }} />
                {reflectConstants.viewButtonLabel}
            </button>
            <p className="px-2 text-[12px] leading-5 text-muted-foreground">{reflectConstants.viewHint}</p>
        </div>
    );
}
