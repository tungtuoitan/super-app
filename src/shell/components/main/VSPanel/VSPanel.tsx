import { X, Terminal } from "lucide-react";
import { useState } from "react";
import { Panel } from "react-resizable-panels";
import { useDeviceStore, ConsoleTab } from "@/shared";
import { TabNameList } from "./TabNameList";
import {useActivityBarStore} from "@/shell/store/ActivityBar.store";
import {useSideBarStore} from "@/shell/store/SideBar.store";
import {useEditorTabBarHelper} from "@/shell/hooks/useEditorTabBar.helper";
import {moduleRegistry} from "@/shell/moduleRegistry";
import {PanelTabDefinition} from "@/shell/types/moduleRegistry.type";

interface VSPanelProps {
    onClose: () => void;
}

/**
 * VSPanel — bottom panel.
 * Panel tabs are contributed by the active module via the registry.
 * Global tabs (e.g. noteDetail) declare showWhenTabType and are included when the active editor tab matches.
 */
export function VSPanel({ onClose }: VSPanelProps) {
    const { isPanelVisible, setIsPanelVisible } = useActivityBarStore();
    const { moduleName } = useSideBarStore();
    const { isMobile } = useDeviceStore();
    const { getActiveTab } = useEditorTabBarHelper();
    const activeTab = getActiveTab();

    // Collect hook-based panel tabs from all modules (registry is stable — hook count is stable)
    // eslint-disable-next-line react-hooks/rules-of-hooks -- registry is immutable after startup; hook count is stable
    const allModuleHookTabs = moduleRegistry.getAll().map((m) => ({
        moduleId: m.id,
        // eslint-disable-next-line react-hooks/rules-of-hooks
        tabs: m.usePanelTabs != null ? m.usePanelTabs() : (m.panelTabs ?? []),
    }));
    const modulePanelTabs = allModuleHookTabs.find((m) => m.moduleId === moduleName)?.tabs ?? [];

    // Include global tabs (showWhenTabType) when the active editor tab matches
    const globalTabs = moduleRegistry.getGlobalPanelTabs()
        .filter((t) => t.showWhenTabType === activeTab?.type);

    const allTabs: Array<PanelTabDefinition | { id: "console"; label: "Console"; icon: typeof Terminal }> = [
        ...modulePanelTabs,
        ...globalTabs,
        ...(isMobile ? [{ id: "console" as const, label: "Console" as const, icon: Terminal }] : [])
    ];

    const [activeTabId, setActiveTabId] = useState<string>(allTabs[0]?.id ?? "");

    const currentTabExists = allTabs.some((t) => t.id === activeTabId);
    const resolvedTabId = currentTabExists ? activeTabId : (allTabs[0]?.id ?? "");

    const changeTab = (id: string) => {
        const prevTab = allTabs.find((t) => t.id === resolvedTabId);
        if (prevTab && "onLeave" in prevTab && prevTab.onLeave) prevTab.onLeave();
        setActiveTabId(id);
    };

    return (
        <Panel
            id="bottom-panel"
            defaultSize={30}
            minSize={5}
            maxSize={60}
            collapsible
            collapsedSize={0}
            onCollapse={() => setIsPanelVisible(false)}
            onExpand={() => setIsPanelVisible(true)}
        >
            {isPanelVisible && (
                <div className="h-full border-t border-editor-border bg-editor-bg flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-editor-border h-[35px]">
                        <div className="flex h-full">
                            <TabNameList allTabs={allTabs} moduleName={moduleName} activeTabId={activeTabId} onTabChange={changeTab} />
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1 mr-2 text-muted-foreground hover:text-editor-fg hover:bg-editor-hover rounded transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className={`flex-1 overflow-auto ${resolvedTabId === "moving" || resolvedTabId === "console" ? "" : "p-3"}`}>
                        {resolvedTabId === "console" && isMobile
                            ? <ConsoleTab />
                            : allTabs.filter((t): t is PanelTabDefinition => t.id === resolvedTabId && "Content" in t)
                                .map((t) => <t.Content key={t.id} activeTab={activeTab} />)
                        }
                    </div>
                </div>
            )}
        </Panel>
    );
}
