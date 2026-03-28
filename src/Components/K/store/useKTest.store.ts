import { createContext, useContext, useState, Dispatch, SetStateAction } from "react";
import type { KTestSummary } from "../types/kTest.type";

export interface KTestContextData {
    tests: KTestSummary[];
    setTests: Dispatch<SetStateAction<KTestSummary[]>>;
    isLoadingTests: boolean;
    setIsLoadingTests: Dispatch<SetStateAction<boolean>>;
}

const defaultValue: KTestContextData = {
    tests: [],
    setTests: () => {},
    isLoadingTests: false,
    setIsLoadingTests: () => {},
};

export const KTestStore = createContext<KTestContextData>(defaultValue);

export const useKTestStore = () => useContext(KTestStore);

export function useKTestStoreValues(): KTestContextData {
    const [tests, setTests] = useState<KTestSummary[]>([]);
    const [isLoadingTests, setIsLoadingTests] = useState(false);
    return { tests, setTests, isLoadingTests, setIsLoadingTests };
}
