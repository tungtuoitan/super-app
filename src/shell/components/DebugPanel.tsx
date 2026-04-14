/**
 * Debug Panel Component - Display logs on screen for mobile debugging
 */

import React, { useState } from "react";
import { X, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import {useDebugLogger} from "store/debug/DebugLogger.store";

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
            className="fixed bottom-0 right-0 z-[9999] bg-black/90 text-white border border-gray-600 rounded-t-lg max-w-96 max-h-96"
            style={{
                fontFamily: "monospace",
                fontSize: "11px",
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between bg-gray-800 p-2 border-b border-gray-600 rounded-t-lg cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                <div className="flex items-center gap-2">
                    <span className="font-bold">🐛 DEBUG LOG ({recentLogs.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
            </div>

            {/* Logs Container */}
            {!isCollapsed && (
                <div className="overflow-auto max-h-80 p-2 bg-black/80">
                    {recentLogs.length === 0 ? (
                        <div className="text-gray-500">Waiting for logs...</div>
                    ) : (
                        recentLogs.map((log: any, index: number) => (
                            <div key={index} className="mb-1 pb-1 border-b border-gray-900">
                                {/* Timestamp + Component + Level */}
                                <div className={`text-gray-400`}>
                                    <span className="text-yellow-400">[{log.timestamp}]</span>
                                    <span className="text-blue-400"> {log.component}</span>
                                    <span
                                        className={`
                                            ${log.level === "error" ? "text-red-400" : ""}
                                            ${log.level === "warn" ? "text-orange-400" : ""}
                                            ${log.level === "log" ? "text-green-400" : ""}
                                            ${log.level === "debug" ? "text-gray-500" : ""}
                                        `}
                                    >
                                        {" "}
                                        [{log.level.toUpperCase()}]
                                    </span>
                                </div>

                                {/* Message */}
                                <div className="text-white ml-2">{log.message}</div>

                                {/* Data */}
                                {log.data && (
                                    <div className="text-gray-300 ml-4 bg-gray-900 p-1 rounded mt-1 max-h-32 overflow-auto">
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
                <div className="flex gap-2 p-2 border-t border-gray-600 bg-gray-800 text-xs">
                    <button
                        onClick={handleCopyAll}
                        className={`px-2 py-1 rounded text-white flex items-center gap-1 ${
                            isCopied ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
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
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => setIsEnabled(false)}
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-white"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}
