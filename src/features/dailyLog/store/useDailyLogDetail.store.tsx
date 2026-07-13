import { createContext, useContext, useState, Dispatch, SetStateAction } from "react";
import type { DailyLogValuesMap } from "../types/dailyLog.types";

/**
 * Right-panel editor state. `selectedDate` is null until the user clicks a row.
 * `draftValues` holds unsaved edits keyed by "&lt;section&gt;.&lt;field_key&gt;".
 */
export interface DailyLogDetailContextData {
    selectedDate: Date | null;
    setSelectedDate: Dispatch<SetStateAction<Date | null>>;
    draftValues: DailyLogValuesMap;
    setDraftValues: Dispatch<SetStateAction<DailyLogValuesMap>>;
    isDirty: boolean;
    setIsDirty: Dispatch<SetStateAction<boolean>>;
    isSaving: boolean;
    setIsSaving: Dispatch<SetStateAction<boolean>>;
}

const defaultValue: DailyLogDetailContextData = {
    selectedDate: null,
    draftValues: {},
    isDirty: false,
    isSaving: false,
    setSelectedDate: () => {},
    setDraftValues: () => {},
    setIsDirty: () => {},
    setIsSaving: () => {},
};

export const DailyLogDetailStore = createContext<DailyLogDetailContextData>(defaultValue);

export const useDailyLogDetailStore = () => useContext(DailyLogDetailStore);

export const DailyLogDetailProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [draftValues, setDraftValues] = useState<DailyLogValuesMap>({});
    const [isDirty, setIsDirty] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    return (
        <DailyLogDetailStore.Provider
            value={{ selectedDate, setSelectedDate, draftValues, setDraftValues, isDirty, setIsDirty, isSaving, setIsSaving }}
        >
            {children}
        </DailyLogDetailStore.Provider>
    );
};
