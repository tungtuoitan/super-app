import { X, Terminal } from "lucide-react";
import { useState } from "react";
import { Panel } from "react-resizable-panels";
import { useActivityBarStore } from "@/store/index";
import { useMovingTreeStore } from "@/features/workspace/store/MovingTree.store";
import { useEditorTabHelper } from "@/shell/hooks/useEditorTab.helper";
import { useConsoleStore } from "@/store/console/useConsole.store";
import { useConsoleHelper } from "@/shell/hooks/useConsole.helper";
import { useMobileStore } from "@/store/mobile/Mobile.store";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { moduleRegistry, type PanelTabDefinition } from "@/shell/moduleRegistry";

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

    const modulePanelTabs = moduleRegistry.getPanelTabs(moduleName);

    // Build full tab list: module tabs + console (mobile only)
    const allTabs: Array<PanelTabDefinition | { id: "console"; label: "Console"; icon: typeof Terminal }> = [
        ...modulePanelTabs,
        ...(isMobile ? [{ id: "console" as const, label: "Console" as const, icon: Terminal }] : []),
    ];

    const [activeTabId, setActiveTabId] = useState<string>(allTabs[0]?.id ?? "");

    const changeTab = (id: string) => {
        if (id !== "moving") setTargetWorkspace(null);
        setActiveTabId(id);
    };

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
                            {allTabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => changeTab(tab.id)}
                                        className={`flex items-center gap-1.5 px-3 text-[13px] border-b-2 transition-colors ${
                                            resolvedTabId === tab.id
                                                ? "border-editor-active text-editor-fg"
                                                : "border-transparent text-muted-foreground hover:text-editor-fg"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
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
                        {resolvedTabId === "console" && isMobile ? (
                            <ConsoleTab />
                        ) : (
                            allTabs
                                .filter((t): t is PanelTabDefinition => t.id === resolvedTabId && "Content" in t)
                                .map((t) => <t.Content key={t.id} activeTab={activeTab} />)
                        )}
                    </div>
                </div>
            )}
        </Panel>
    );
}

// ─── Console Tab (mobile only) ───────────────────────────────────────────────

function ConsoleTab() {
    const { messages } = useConsoleStore();
    const { clearMessages, removeMessage } = useConsoleHelper();

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-editor-border">
                <span className="text-sm font-semibold text-editor-fg">Console Messages</span>
                {messages.length > 0 && (
                    <button
                        onClick={clearMessages}
                        className="text-xs px-2 py-1 text-muted-foreground hover:text-editor-fg hover:bg-editor-hover rounded transition-colors"
                    >
                        Clear All
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No messages</div>
                ) : (
                    messages.map((msg) => (
                        <ConsoleMessage
                            key={msg.id}
                            id={msg.id}
                            type={msg.type}
                            message={msg.message}
                            timestamp={msg.timestamp}
                            onRemove={removeMessage}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function ConsoleMessage({ id, type, message, timestamp, onRemove }: {
    id: string; type: string; message: string; timestamp: Date; onRemove: (id: string) => void;
}) {
    const typeStyles: Record<string, string> = {
        error: "text-red-400/80",
        warning: "text-yellow-400/80",
        info: "text-blue-400/80",
        success: "text-green-400/80",
    };
    const typeIcons: Record<string, string> = {
        error: "✕", warning: "⚠", info: "ℹ", success: "✓",
    };
    const color = typeStyles[type] ?? "text-muted-foreground";
    const icon = typeIcons[type] ?? "•";
    const time = timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

    return (
        <div className="group flex items-start gap-2 px-2 py-1 hover:bg-editor-hover/50 rounded text-sm font-mono">
            <span className={`flex-shrink-0 ${color}`}>{icon}</span>
            <span className="flex-shrink-0 text-muted-foreground text-xs">{time}</span>
            <span className={`flex-1 ${color} break-all`}>{message}</span>
            <button
                onClick={() => onRemove(id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-editor-fg transition-opacity text-xs"
            >
                ✕
            </button>
        </div>
    );
}
