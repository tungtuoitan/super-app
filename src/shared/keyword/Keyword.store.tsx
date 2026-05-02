/**
 * Keyword Store (Zustand)
 *
 * Migrated from React Context → Zustand. Public hook API unchanged.
 */

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Dispatch, SetStateAction } from "react";
import { zSetter } from "../zustand-utils";
import type { Keyword } from "./keyword.types";

export interface KeywordContextData {
    allKeywords: Keyword[];
    setAllKeywords: Dispatch<SetStateAction<Keyword[]>>;
    keywordsLoading: boolean;
    setKeywordsLoading: Dispatch<SetStateAction<boolean>>;
    keywordsError: Error | null;
    setKeywordsError: Dispatch<SetStateAction<Error | null>>;
}

const _store = create<KeywordContextData>((set, get) => ({
    allKeywords: [],
    setAllKeywords: zSetter("allKeywords", set, get),
    keywordsLoading: true,
    setKeywordsLoading: zSetter("keywordsLoading", set, get),
    keywordsError: null,
    setKeywordsError: zSetter("keywordsError", set, get),
}));

export const useKeywordStore = () => _store(useShallow((s) => s));
export const getKeywordState = () => _store.getState();
export const subscribeKeywordState = _store.subscribe;
