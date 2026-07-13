import { createContext, useContext, useState, Dispatch, SetStateAction } from "react";
import type { DailyLogFieldTemplate } from "../types/dailyLog.types";

export interface DailyLogTemplateContextData {
    fields: DailyLogFieldTemplate[];
    setFields: Dispatch<SetStateAction<DailyLogFieldTemplate[]>>;
    isLoading: boolean;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
}

const defaultValue: DailyLogTemplateContextData = {
    fields: [],
    isLoading: false,
    setFields: () => {},
    setIsLoading: () => {},
};

export const DailyLogTemplateStore = createContext<DailyLogTemplateContextData>(defaultValue);

export const useDailyLogTemplateStore = () => useContext(DailyLogTemplateStore);

export const DailyLogTemplateProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [fields, setFields] = useState<DailyLogFieldTemplate[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    return (
        <DailyLogTemplateStore.Provider value={{ fields, setFields, isLoading, setIsLoading }}>
            {children}
        </DailyLogTemplateStore.Provider>
    );
};
