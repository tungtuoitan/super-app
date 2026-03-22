import { FilePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskDetailSectionStore } from "@/store/task/useTaskDetailSection.store";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { useTaskCustomTabSelector } from "@/Selectors/task/TaskCustomTabSelector";
import { useTaskSectionHelper } from "@/hooks/task/useTaskSection.helper";
import { TAB_COLORS } from "@/types/task/taskDetailSection.constants";
import type { SectionTab } from "@/store/task/useTaskDetailSection.store";

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
                "group flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors -mb-[1px] cursor-pointer",
                isActive ? TAB_COLORS.custom.active : "border-transparent text-muted-foreground hover:text-foreground",
            )}
        >
            <FilePlus className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-[120px]">{tab.name}</span>
            <span className="text-[9px] opacity-60 shrink-0">v{tab.version}</span>
            {!isDisabled && (
                <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCustomTab(tabId, e.currentTarget); }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                    title="Delete tab"
                >
                    <Trash2 className="h-2.5 w-2.5" />
                </button>
            )}
        </div>
    );
}
