import {ConsoleMessageType} from "./console.types";
import {useConsoleStore} from "./useConsole.store";

export const useConsoleHelper = () => {
    const { messages, setMessages, maxMessages } = useConsoleStore();

    /**
     * Add a message to the console
     * @param message - The message text to display
     * @param type - The message type (error, warning, info, success)
     */
    const addMessage = (message: string, type: ConsoleMessageType = "info") => {
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
        };

    /**
     * Clear all console messages
     */
    const clearMessages = () => {
        setMessages([]);
    };

    /**
     * Remove a specific message by ID
     */
    const removeMessage = (id: string) => {
            setMessages((prev) => prev.filter((msg) => msg.id !== id));
        };

    /**
     * Convenience methods for different message types
     */
    const error = (message: string, error?: any) => addMessage(message, "error");
    const warning = (message: string) => addMessage(message, "warning");
    const info = (message: string) => addMessage(message, "info");
    const success = (message: string) => addMessage(message, "success");
    const specialSuccess = (message: string) => addMessage(message, "special-success");

    return {
        messages,
        addMessage,
        clearMessages,
        removeMessage,
        error,
        warning,
        info,
        success,
        specialSuccess,
    };
};
