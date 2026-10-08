import { FilePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskDetailSectionStore } from "../../store/useTaskDetailSection.store";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskCustomTabSelector } from "../../Selectors/TaskCustomTabSelector";
import { useTaskSectionHelper } from "../../hooks/taskSection/useTaskSection.helper";
import type { SectionTab } from "../../store/useTaskDetailSection.store";

/** Rendered per custom tab in the tab bar — only accepts a tabId. */
export function CustomTabButton({ tabId }: { tabId: string }) {
    const { activeSection } = useTaskDetailSectionStore();
    const { isDisabled } = useTaskDetailSelector();
    const { customTabs } = useTaskCustomTabSelector();
    const { handleTabClick, handleDeleteCustomTab } = useTaskSectionHelper();

    const tab = customTabs.tabs.find((t) => t.id === tabId);
    const tabKey: SectionTab = `custom:${tabId}`;
    const isActive = activeSection === tabKey;

    if (!tab) return null;

    return (
        <div
            onClick={() => handleTabClick(tabKey)}
            className={cn(
                "group flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] font-medium transition-colors duration-100",
                isActive ? "bg-sa-hover-strong text-foreground" : "text-muted-foreground hover:bg-sa-hover hover:text-foreground",
            )}
        >
            <FilePlus className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-[120px]">{tab.name}</span>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">v{tab.version}</span>
            {!isDisabled && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCustomTab(tabId, e.currentTarget); }}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity duration-100 hover:text-sa-danger group-hover:opacity-100"
                    title="Delete tab"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}
