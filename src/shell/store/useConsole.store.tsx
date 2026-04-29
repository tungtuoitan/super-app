/**
 * Console Store
 * Centralized state management for console messages
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";
import {ConsoleMessage} from "../types/console.types";


export interface ConsoleContextData {
    messages: ConsoleMessage[];
    setMessages: Dispatch<SetStateAction<ConsoleMessage[]>>;
    maxMessages: number;
    setMaxMessages: Dispatch<SetStateAction<number>>;
}

export const consoleContextDefaultValue: ConsoleContextData = {
    messages: [],
    setMessages: () => {},
    maxMessages: 100,
    setMaxMessages: () => {},
};

export const ConsoleStore = createContext<ConsoleContextData>(consoleContextDefaultValue);

export const useConsoleStore = () => useContext(ConsoleStore);

export const ConsoleProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [messages, setMessages] = useState<ConsoleMessage[]>([]);
    const [maxMessages, setMaxMessages] = useState<number>(100);

    return (
        <ConsoleStore.Provider
            value={{
                messages,
                setMessages,
                maxMessages,
                setMaxMessages,
            }}
        >
            {children}
        </ConsoleStore.Provider>
    );
};
