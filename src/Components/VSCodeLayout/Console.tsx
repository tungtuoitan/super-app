import { Panel } from "react-resizable-panels";
import { useConsoleStore, ConsoleMessageType } from "@/store/console/useConsole.store";
import { useConsoleHelper } from "@/hooks/console/useConsole.helper";
import { Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function Console() {
    const { messages } = useConsoleStore();
    const { clearMessages, removeMessage } = useConsoleHelper();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <Panel defaultSize={30} minSize={5} collapsible collapsedSize={0}>
            <div className="w-full h-full bg-editor-bg flex flex-col overflow-hidden border-t border-editor-border">
                {/* Header */}
                <div className="h-[35px] flex items-center justify-between border-b border-editor-border bg-editor-sidebar overflow-hidden px-3">
                    <div className="text-[13px] text-muted-foreground">Console</div>
                    {messages.length > 0 && (
                        <button
                            onClick={clearMessages}
                            className="p-1 text-muted-foreground hover:text-editor-fg hover:bg-editor-hover rounded transition-colors"
                            title="Clear console"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-auto p-2">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No messages</div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <ConsoleMessage key={msg.id} id={msg.id} type={msg.type} message={msg.message} timestamp={msg.timestamp} onRemove={removeMessage} />
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>
            </div>
        </Panel>
    );
}

interface ConsoleMessageProps {
    id: string;
    type: ConsoleMessageType;
    message: string;
    timestamp: Date;
    onRemove: (id: string) => void;
}

function ConsoleMessage({ id, type, message, timestamp, onRemove }: ConsoleMessageProps) {
    const getTypeStyles = (type: ConsoleMessageType) => {
        switch (type) {
            case "error":
                return "text-red-400/80";
            // case "warning":
            //     return "text-yellow-400/80";
            // case "info":
            //     return "text-blue-400/80";
            // case "success":
            //     return "text-green-400/80";
            default:
                return "text-muted-foreground/70";
        }
    };

    const getTypeIcon = (type: ConsoleMessageType) => {
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
        <div className="group flex items-start gap-2 px-2 hover:bg-editor-hover/50 rounded text-xs font-mono items-center">
            {/* <span className={`flex-shrink-0 ${getTypeStyles(type)}`}>{getTypeIcon(type)}</span> */}
            <span className="flex-shrink-0 text-muted-foreground text-xs pr-2">{formatTime(timestamp)}</span>
            <span className={`flex-1 ${getTypeStyles(type)} break-all text-left`}>{message}</span>
            {/* <button onClick={() => onRemove(id)} className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-editor-fg transition-opacity" title="Remove message">
                <X className="w-3 h-3" />
            </button> */}
        </div>
    );
}
