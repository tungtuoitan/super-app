import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Dispatch, SetStateAction } from "react";
import { zSetter } from "@/shared";
import type { LinkDTO } from "@/shared";

/** Links of the project shown in ProjectGeneral (task #1477). */
export interface ProjectLinksStoreData {
    projectLinks: LinkDTO[];
    setProjectLinks: Dispatch<SetStateAction<LinkDTO[]>>;
    isLoadingProjectLinks: boolean;
    setIsLoadingProjectLinks: Dispatch<SetStateAction<boolean>>;
}

const _store = create<ProjectLinksStoreData>((set, get) => ({
    projectLinks: [],
    setProjectLinks: zSetter("projectLinks", set, get),
    isLoadingProjectLinks: false,
    setIsLoadingProjectLinks: zSetter("isLoadingProjectLinks", set, get),
}));

export const useProjectLinksStore = () => _store(useShallow((s) => s));
export const getProjectLinksState = () => _store.getState();
