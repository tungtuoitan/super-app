
export function ConsoleMessage({ id, type, message, timestamp, onRemove }: {
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
