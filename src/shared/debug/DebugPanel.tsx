/**
 * Debug Panel Component - Display logs on screen for mobile debugging
 */

import React, { useState } from "react";
import { X, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import {useDebugLogger} from "./DebugLogger.store";

export function DebugPanel() {
    const { logs, clearLogs, isEnabled, setIsEnabled } = useDebugLogger();
    const [isOpen, setIsOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    if (!isEnabled) return null;

    const recentLogs = logs.slice(0, 20); // Show last 20 logs

    const handleCopyAll = () => {
        // Format all logs as readable text
        const logsText = logs
            .map(
                (log) =>
                    `[${log.timestamp}] ${log.component} [${log.level.toUpperCase()}]\n${log.message}${
                        log.data ? "\nData: " + JSON.stringify(log.data, null, 2) : ""
                    }`
            )
            .join("\n\n---\n\n");

        // Copy to clipboard
        navigator.clipboard.writeText(logsText).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); // Reset after 2s
        });
    };

    return (
        <div
            className="fixed bottom-0 right-0 z-[9999] sa-shadow-pop bg-popover text-popover-foreground border border-sa-border-strong rounded-t-lg font-mono text-[11px] max-w-96 max-h-96"
            style={{
                fontFamily: "monospace",
                fontSize: "11px",
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between bg-sa-surface-2 p-2 border-b border-sa-border rounded-t-lg cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                <div className="flex items-center gap-2">
                    <span className="font-bold">🐛 DEBUG LOG ({recentLogs.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
            </div>

            {/* Logs Container */}
            {!isCollapsed && (
                <div className="overflow-auto max-h-80 p-2 bg-popover">
                    {recentLogs.length === 0 ? (
                        <div className="text-muted-foreground">Waiting for logs...</div>
                    ) : (
                        recentLogs.map((log: any, index: number) => (
                            <div key={index} className="mb-1 pb-1 border-b border-sa-border">
                                {/* Timestamp + Component + Level */}
                                <div className={`text-muted-foreground`}>
                                    <span className="text-sa-amber-ink">[{log.timestamp}]</span>
                                    <span className="text-foreground"> {log.component}</span>
                                    <span
                                        className={`
                                            ${log.level === "error" ? "text-sa-danger" : ""}
                                            ${log.level === "warn" ? "text-sa-amber-ink" : ""}
                                            ${log.level === "log" ? "text-sa-good" : ""}
                                            ${log.level === "debug" ? "text-muted-foreground" : ""}
                                        `}
                                    >
                                        {" "}
                                        [{log.level.toUpperCase()}]
                                    </span>
                                </div>

                                {/* Message */}
                                <div className="text-foreground ml-2">{log.message}</div>

                                {/* Data */}
                                {log.data && (
                                    <div className="text-muted-foreground ml-4 bg-sa-surface p-1 rounded mt-1 max-h-32 overflow-auto">
                                        <pre>{JSON.stringify(log.data, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Footer */}
            {!isCollapsed && (
                <div className="flex gap-2 p-2 border-t border-sa-border bg-sa-surface-2 text-xs">
                    <button
                        onClick={handleCopyAll}
                        className={`px-2 py-1 rounded-md border flex items-center gap-1 ${
                            isCopied ? "border-sa-good/40 text-sa-good" : "border-sa-border-strong hover:bg-sa-hover-strong"
                        }`}
                    >
                        {isCopied ? (
                            <>
                                <Check className="w-3 h-3" /> Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="w-3 h-3" /> Copy All
                            </>
                        )}
                    </button>
                    <button
                        onClick={clearLogs}
                        className="px-2 py-1 rounded-md border border-sa-danger/40 text-sa-danger hover:bg-sa-danger/10"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => setIsEnabled(false)}
                        className="px-2 py-1 rounded-md border border-sa-border-strong hover:bg-sa-hover-strong"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}
