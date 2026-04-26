import { X, Terminal, ArrowRightLeft, FileText } from "lucide-react";
import { useState } from "react";
import { Panel } from "react-resizable-panels";
import { useActivityBarStore } from "@/store/index";
import { useMovingTreeStore } from "@/features/workspace/store/MovingTree.store";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { useMobileStore } from "@/shared/store/Mobile.store";
import { useGridControlStore } from "@/shared/store/useGridControl.store";
import { moduleRegistry, type PanelTabDefinition } from "@/shell/moduleRegistry";
import { ConsoleTab } from "./MobileConsole/ConsoleTab";
import { NoteBodyInPanel } from "@/features/note/Components/NoteBodyInPanel";
import { TabNameList } from "./TabNameList";
import { constants } from "@/utils/constants";

const NoteBodyInPanelContent = () => <NoteBodyInPanel />;

interface VSPanelProps {
    onClose: () => void;
}

/**
 * VSPanel — bottom panel.
 * Panel tabs are contributed by the active module via the registry.
 */
export function VSPanel({ onClose }: VSPanelProps) {
    const { isPanelVisible, setIsPanelVisible } = useActivityBarStore();
    const { moduleName } = useGridControlStore();
    const { setTargetWorkspace } = useMovingTreeStore();
    const { isMobile } = useMobileStore();
    const { getActiveTab } = useEditorTabHelper();
    const activeTab = getActiveTab();
    const isNoteTab = activeTab?.type === constants.vscode.tab.tabTypes.note;

    const changeTab = (id: string) => {
        if (id !== "moving") setTargetWorkspace(null);
        setActiveTabId(id);
    };

    const modulePanelTabs = moduleRegistry.getPanelTabs(moduleName);

    // Build full tab list: module tabs + noteDetail (only when active tab is note) + console (mobile only)
    const allTabs: Array<PanelTabDefinition | { id: "console"; label: "Console"; icon: typeof Terminal }> = [
        ...modulePanelTabs,
        ...(isNoteTab ? [{
            id: "noteDetail",
            label: "Note Detail",
            icon: FileText,
            Content: NoteBodyInPanelContent,
        }] : []),
        ...(isMobile ? [{ id: "console" as const, label: "Console" as const, icon: Terminal }] : [])
    ];

    const [activeTabId, setActiveTabId] = useState<string>(allTabs[0]?.id ?? "");

    // If module changed and current tab doesn't exist in new module, reset to first
    const currentTabExists = allTabs.some((t) => t.id === activeTabId);
    const resolvedTabId = currentTabExists ? activeTabId : (allTabs[0]?.id ?? "");

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
                    {/* Tab header */}
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

                    {/* Tab content */}
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
