import { useConsoleStore, ConsoleMessageType } from "@/store/console/useConsole.store";
import { useCallback } from "react";

export const useConsoleHelper = () => {
    const { messages, setMessages, maxMessages } = useConsoleStore();

    /**
     * Add a message to the console
     * @param message - The message text to display
     * @param type - The message type (error, warning, info, success)
     */
    const addMessage = useCallback(
        (message: string, type: ConsoleMessageType = "info") => {
            const newMessage = {
                id: `${Date.now()}-${Math.random()}`,
                type,
                message,
                timestamp: new Date(),
            };

            setMessages((prev) => {
                const updated = [...prev, newMessage];
                // Keep only the last maxMessages
                if (updated.length > maxMessages) {
                    return updated.slice(updated.length - maxMessages);
                }
                return updated;
            });
        },
        [setMessages, maxMessages]
    );

    /**
     * Clear all console messages
     */
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, [setMessages]);

    /**
     * Remove a specific message by ID
     */
    const removeMessage = useCallback(
        (id: string) => {
            setMessages((prev) => prev.filter((msg) => msg.id !== id));
        },
        [setMessages]
    );

    /**
     * Convenience methods for different message types
     */
    const error = useCallback((message: string, error?: any) => addMessage(message, "error"), [addMessage]);
    const warning = useCallback((message: string) => addMessage(message, "warning"), [addMessage]);
    const info = useCallback((message: string) => addMessage(message, "info"), [addMessage]);
    const success = useCallback((message: string) => addMessage(message, "success"), [addMessage]);

    return {
        messages,
        addMessage,
        clearMessages,
        removeMessage,
        error,
        warning,
        info,
        success,
    };
};
