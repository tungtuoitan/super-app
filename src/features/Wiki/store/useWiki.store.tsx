import { createContext, Dispatch, SetStateAction, useContext, useEffect, useState } from "react";
import type { WikiInfo, WikiKeyword } from "../types/wiki.type";

const MARKED_STORAGE_KEY = "wiki_marked_kw";
const MAX_MARKED = 5;

interface WikiContextData {
    keywords: WikiKeyword[];
    setKeywords: Dispatch<SetStateAction<WikiKeyword[]>>;
    infos: WikiInfo[];
    setInfos: Dispatch<SetStateAction<WikiInfo[]>>;
    isLoading: boolean;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
    // which keywords are selected in the graph (drives the info panel filter)
    selectedKeywordIds: number[];
    setSelectedKeywordIds: Dispatch<SetStateAction<number[]>>;
    // which keywords are pinned/bookmarked (max 5, persisted to localStorage)
    markedKeywordIds: number[];
    setMarkedKeywordIds: Dispatch<SetStateAction<number[]>>;
    searchText: string;
    setSearchText: Dispatch<SetStateAction<string>>;
    // signal graph to pan/zoom to this keyword node
    focusKeywordId: number | null;
    setFocusKeywordId: Dispatch<SetStateAction<number | null>>;
}

const defaultValue: WikiContextData = {
    keywords: [],
    setKeywords: () => {},
    infos: [],
    setInfos: () => {},
    isLoading: false,
    setIsLoading: () => {},
    selectedKeywordIds: [],
    setSelectedKeywordIds: () => {},
    markedKeywordIds: [],
    setMarkedKeywordIds: () => {},
    searchText: "",
    setSearchText: () => {},
    focusKeywordId: null,
    setFocusKeywordId: () => {},
};

const WikiContext = createContext<WikiContextData>(defaultValue);

export const WikiProvider = ({ children }: { children: React.ReactNode }) => {
    const [keywords, setKeywords]               = useState<WikiKeyword[]>([]);
    const [infos, setInfos]                     = useState<WikiInfo[]>([]);
    const [isLoading, setIsLoading]             = useState(false);
    const [selectedKeywordIds, setSelectedKeywordIds] = useState<number[]>([]);
    const [searchText, setSearchText]           = useState("");
    const [focusKeywordId, setFocusKeywordId]   = useState<number | null>(null);
    const [markedKeywordIds, setMarkedKeywordIds] = useState<number[]>(() => {
        try {
            const stored = localStorage.getItem(MARKED_STORAGE_KEY);
            return stored ? (JSON.parse(stored) as number[]).slice(0, MAX_MARKED) : [];
        } catch { return []; }
    });

    // Persist marked ids whenever they change
    useEffect(() => {
        localStorage.setItem(MARKED_STORAGE_KEY, JSON.stringify(markedKeywordIds));
    }, [markedKeywordIds]);

    return (
        <WikiContext.Provider value={{
            keywords, setKeywords,
            infos, setInfos,
            isLoading, setIsLoading,
            selectedKeywordIds, setSelectedKeywordIds,
            markedKeywordIds, setMarkedKeywordIds,
            searchText, setSearchText,
            focusKeywordId, setFocusKeywordId,
        }}>
            {children}
        </WikiContext.Provider>
    );
};

export const useWikiStore = () => useContext(WikiContext);
