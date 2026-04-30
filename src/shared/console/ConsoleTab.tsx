import {ConsoleMessage} from "./ConsoleMessage";
import {useConsoleHelper} from "./useConsole.helper";
import {useConsoleStore} from "./useConsole.store";


export function ConsoleTab() {
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
