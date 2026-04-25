import { createContext, useContext, useState, useMemo, Dispatch, SetStateAction } from "react";
import type { KTestSummary } from "../types/kTest.type";

export interface KTestContextData {
    tests: KTestSummary[];
    setTests: Dispatch<SetStateAction<KTestSummary[]>>;
    isLoadingTests: boolean;
    setIsLoadingTests: Dispatch<SetStateAction<boolean>>;
    /** Currently selected k.node.id — tests are filtered to this node. Null = show all. */
    activeNodeId: number | null;
    setActiveNodeId: Dispatch<SetStateAction<number | null>>;
}

const defaultValue: KTestContextData = {
    tests: [],
    setTests: () => {},
    isLoadingTests: false,
    setIsLoadingTests: () => {},
    activeNodeId: null,
    setActiveNodeId: () => {},
};

export const KTestStore = createContext<KTestContextData>(defaultValue);

export const useKTestStore = () => useContext(KTestStore);

export function useKTestStoreValues(): KTestContextData {
    const [tests, setTests] = useState<KTestSummary[]>([]);
    const [isLoadingTests, setIsLoadingTests] = useState(false);
    const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
    return useMemo(
        () => ({ tests, setTests, isLoadingTests, setIsLoadingTests, activeNodeId, setActiveNodeId }),
        [tests, isLoadingTests, activeNodeId],
    );
}
