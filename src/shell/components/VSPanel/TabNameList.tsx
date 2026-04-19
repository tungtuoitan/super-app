import { X, Terminal } from "lucide-react";
import { moduleRegistry, type PanelTabDefinition } from "@/shell/moduleRegistry";

interface VSPanelHeaderProps {
    moduleName: string;
    activeTabId: string;
    onTabChange: (id: string) => void;
}

export function TabNameList({ allTabs, moduleName, activeTabId, onTabChange }: VSPanelHeaderProps & { allTabs: Array<PanelTabDefinition | { id: "console"; label: "Console"; icon: typeof Terminal }> }) {

    return (
        <div className="flex h-full">
            {allTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex items-center gap-1.5 px-3 text-[13px] border-b-2 transition-colors ${
                            activeTabId === tab.id
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
    );
}
