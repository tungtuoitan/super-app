import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { X, FileText, Settings, ArrowRightLeft, Terminal } from "lucide-react";
import { useState } from "react";
import { Panel } from "react-resizable-panels";
import { useActivityBarStore, useMovingTreeStore } from "@/store/index";
import { useEditorTabHelper } from "@/hooks/vsCode/useEditorTab.helper";
import { constants } from "@/utils/constants";
import { Note } from "@/types/note.types";
import { MovingTab } from "../VSPanel/MovingTab";
import { useConsoleStore } from "@/store/console/useConsole.store";
import { useConsoleHelper } from "@/hooks/console/useConsole.helper";
import { useMobileStore } from "@/store/mobile/Mobile.store";
import { NoteDetailTab } from "../Note/NoteDetailTab";
import {useGridControlStore} from "@/store/grid/useGridControl.store";
import {kconstants} from "../K/utils/K.Constants";
import {KMovingTab} from "../K/Components/VSPanel/KMovingTab";

interface VSPanelProps {
    onClose: () => void;
}

type PanelTab = "noteDetail" | "properties" | "moving" | "console";

/**
 * VSPanel - Bottom panel for content details
 *
 * Tabs:
 * - Note Detail: Selected note details and content
 * - Properties: Note properties and metadata
 *
 * Collapse behavior:
 * - When collapsed, panel size goes to 0 but resize handle remains visible
 * - User can drag the resize handle to expand the panel again (like VSCode)
 */
export function VSPanel({ onClose }: VSPanelProps) {
    const [activeTabb, setActiveTabb] = useState<PanelTab>("noteDetail");
    const { isPanelVisible, setIsPanelVisible } = useActivityBarStore();
    const { moduleName } = useGridControlStore();
    console.log('>>>>>>>>> w',moduleName === kconstants.modules.workspace && activeTabb === "moving");
    const { setTargetWorkspace } = useMovingTreeStore();
    const { isMobile } = useMobileStore();
    const changeTab = (tab: PanelTab) => {
        if (tab !== "moving") setTargetWorkspace(null);
        setActiveTabb(tab);
    };
    const { getActiveTab } = useEditorTabHelper();
    const activeTab = getActiveTab();

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
                    {/* Tabs Header */}
                    <div className="flex items-center justify-between border-b border-editor-border h-[35px]">
                        <div className="flex h-full">
                            <button
                                onClick={() => changeTab("noteDetail")}
                                className={`flex items-center gap-1.5 px-3 text-[13px] border-b-2 transition-colors ${
                                    activeTabb === "noteDetail" ? "border-editor-active text-editor-fg" : "border-transparent text-muted-foreground hover:text-editor-fg"
                                }`}
                            >
                                <FileText className="w-4 h-4" />
                                <span>{activeTabb === "noteDetail" && activeTab?.type === constants.vscode.tab.tabTypes.note ? "Note Detail" : "Detail"}</span>
                            </button>
                            {/* <button
                                onClick={() => changeTab("properties")}
                                className={`flex items-center gap-1.5 px-3 text-[13px] border-b-2 transition-colors ${
                                    activeTabb === "properties" ? "border-editor-active text-editor-fg" : "border-transparent text-muted-foreground hover:text-editor-fg"
                                }`}
                            >
                                <Settings className="w-4 h-4" />
                                <span>Properties</span>
                            </button> */}
                            <button
                                onClick={() => changeTab("moving")}
                                className={`flex items-center gap-1.5 px-3 text-[13px] border-b-2 transition-colors ${
                                    activeTabb === "moving" ? "border-editor-active text-editor-fg" : "border-transparent text-muted-foreground hover:text-editor-fg"
                                }`}
                            >
                                <ArrowRightLeft className="w-4 h-4" />
                                <span>Moving</span>
                            </button>
                            {isMobile && (
                                <button
                                    onClick={() => changeTab("console")}
                                    className={`flex items-center gap-1.5 px-3 text-[13px] border-b-2 transition-colors ${
                                        activeTabb === "console" ? "border-editor-active text-editor-fg" : "border-transparent text-muted-foreground hover:text-editor-fg"
                                    }`}
                                >
                                    <Terminal className="w-4 h-4" />
                                    <span>Console</span>
                                </button>
                            )}
                        </div>

                        <button onClick={onClose} className="p-1 mr-2 text-muted-foreground hover:text-editor-fg hover:bg-editor-hover rounded transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Panel Content */}
                    <div className={`flex-1 overflow-auto ${activeTabb === "moving" || activeTabb === "console" ? "" : "p-3"}`}>
                        {activeTabb === "noteDetail" && activeTab?.type === constants.vscode.tab.tabTypes.note && <NoteDetailTab />}
                        {/* {activeTabb === "properties" && <PropertiesTab />} */}
                        {moduleName === kconstants.modules.workspace && activeTabb === "moving" && <MovingTab />}
                        {moduleName === kconstants.modules.k && activeTabb === "moving" && <KMovingTab />}
                        {activeTabb === "console" && isMobile && <ConsoleTab />}
                    </div>
                </div>
            )}
        </Panel>
    );
}

/**
 * Properties Tab - Display note properties
 */
function PropertiesTab() {
    const { getActiveTab } = useEditorTabHelper();
    const activeTabb = getActiveTab();
    const activeNote = activeTabb?.type === constants.vscode.tab.tabTypes.note ? (activeTabb.data as Note) : null;

    if (!activeNote) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">Select a note to view properties</p>
            </div>
        );
    }

    return (
        <div>
            <p className="text-sm font-semibold mb-2 text-editor-fg">Note Properties</p>

            <div className="flex flex-col gap-1">
                <PropertyRow label="ID" value={activeNote.id.toString()} />
                <PropertyRow label="Name" value={activeNote.name} />
                <PropertyRow label="Type" value={activeNote.type || "N/A"} />
                <PropertyRow label="Deleted" value={activeNote.deletedAt ? "Yes" : "No"} />
                <PropertyRow label="Created By" value={activeNote.createdBy || "Unknown"} />
            </div>
        </div>
    );
}

/**
 * Property row component
 */
function PropertyRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex gap-2">
            <span className="min-w-[100px] text-muted-foreground text-xs">{label}:</span>
            <span className="text-editor-fg text-xs">{value}</span>
        </div>
    );
}

/**
 * Console Tab - Display console messages
 */

function ConsoleTab() {
    const { messages } = useConsoleStore();
    const { clearMessages, removeMessage } = useConsoleHelper();

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-editor-border">
                <span className="text-sm font-semibold text-editor-fg">Console Messages</span>
                {messages.length > 0 && (
                    <button onClick={clearMessages} className="text-xs px-2 py-1 text-muted-foreground hover:text-editor-fg hover:bg-editor-hover rounded transition-colors">
                        Clear All
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-2 space-y-1">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No messages</div>
                ) : (
                    messages.map((msg) => <ConsoleMessage key={msg.id} id={msg.id} type={msg.type} message={msg.message} timestamp={msg.timestamp} onRemove={removeMessage} />)
                )}
            </div>
        </div>
    );
}

/**
 * Console Message Component
 */
function ConsoleMessage({ id, type, message, timestamp, onRemove }: { id: string; type: string; message: string; timestamp: Date; onRemove: (id: string) => void }) {
    const getTypeStyles = (type: string) => {
        switch (type) {
            case "error":
                return "text-red-400/80";
            case "warning":
                return "text-yellow-400/80";
            case "info":
                return "text-blue-400/80";
            case "success":
                return "text-green-400/80";
            default:
                return "text-muted-foreground";
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "error":
                return "✕";
            case "warning":
                return "⚠";
            case "info":
                return "ℹ";
            case "success":
                return "✓";
            default:
                return "•";
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
    };

    return (
        <div className="group flex items-start gap-2 px-2 py-1 hover:bg-editor-hover/50 rounded text-sm font-mono">
            <span className={`flex-shrink-0 ${getTypeStyles(type)}`}>{getTypeIcon(type)}</span>
            <span className="flex-shrink-0 text-muted-foreground text-xs">{formatTime(timestamp)}</span>
            <span className={`flex-1 ${getTypeStyles(type)} break-all`}>{message}</span>
            <button
                onClick={() => onRemove(id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-editor-fg transition-opacity text-xs"
                title="Remove"
            >
                ✕
            </button>
        </div>
    );
}
