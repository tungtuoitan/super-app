import { createContext, useContext, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { KQuestion } from "../types/kTest.type";

export interface KTestContextData {
    questions: KQuestion[];
    setQuestions: Dispatch<SetStateAction<KQuestion[]>>;
    isLoadingQuestions: boolean;
    setIsLoadingQuestions: Dispatch<SetStateAction<boolean>>;
}

const defaultValue: KTestContextData = {
    questions: [],
    setQuestions: () => {},
    isLoadingQuestions: false,
    setIsLoadingQuestions: () => {},
};

export const KTestStore = createContext<KTestContextData>(defaultValue);

export const useKTestStore = () => useContext(KTestStore);

export function useKTestStoreValues(): KTestContextData {
    const [questions, setQuestions] = useState<KQuestion[]>([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    return { questions, setQuestions, isLoadingQuestions, setIsLoadingQuestions };
}
