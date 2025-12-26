/**
 * Hashtag UI Store
 * React Context store for managing hashtag UI state in notes
 * Pattern: Separate store from business logic (similar to EditorTabStore)
 *
 * NOTE: This is different from ExplorerStore which manages workspace folder tree
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";
import type { Folder as Hashtag } from "@/types/folder.types";

export interface HashtagUIStoreData {
    // Selected hashtag state (for dialogs, editing)
    selectedHashtag: Hashtag | null;
    setSelectedHashtag: Dispatch<SetStateAction<Hashtag | null>>;
    isDialogOpen: boolean;
    setIsDialogOpen: Dispatch<SetStateAction<boolean>>;

    // Create dialog state
    isCreateDialogOpen: boolean;
    setIsCreateDialogOpen: Dispatch<SetStateAction<boolean>>;

    // Filter/search state (for hashtag picker in note editor)
    searchText: string;
    setSearchText: Dispatch<SetStateAction<string>>;
    showArchived: boolean;
    setShowArchived: Dispatch<SetStateAction<boolean>>;

    // Selection state for hashtag picker (multi-select in note editor)
    selectedHashtagIds: number[];
    setSelectedHashtagIds: Dispatch<SetStateAction<number[]>>;
}

export const hashtagUIStoreDefaultValue: HashtagUIStoreData = {
    selectedHashtag: null,
    setSelectedHashtag: () => {},
    isDialogOpen: false,
    setIsDialogOpen: () => {},
    isCreateDialogOpen: false,
    setIsCreateDialogOpen: () => {},
    searchText: "",
    setSearchText: () => {},
    showArchived: false,
    setShowArchived: () => {},
    selectedHashtagIds: [],
    setSelectedHashtagIds: () => {},
};

export const HashtagUIStore = createContext<HashtagUIStoreData>(hashtagUIStoreDefaultValue);

export const useHashtagUIStore = () => useContext(HashtagUIStore);

export const HashtagUIStoreProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Dialog state
    const [selectedHashtag, setSelectedHashtag] = useState<Hashtag | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

    // Create dialog state
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);

    // Filter state
    const [searchText, setSearchText] = useState<string>("");
    const [showArchived, setShowArchived] = useState<boolean>(false);

    // Selection state
    const [selectedHashtagIds, setSelectedHashtagIds] = useState<number[]>([]);

    return (
        <HashtagUIStore.Provider
            value={{
                selectedHashtag,
                setSelectedHashtag,
                isDialogOpen,
                setIsDialogOpen,
                isCreateDialogOpen,
                setIsCreateDialogOpen,
                searchText,
                setSearchText,
                showArchived,
                setShowArchived,
                selectedHashtagIds,
                setSelectedHashtagIds,
            }}
        >
            {children}
        </HashtagUIStore.Provider>
    );
};
