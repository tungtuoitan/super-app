/**
 * SideBar Store (Zustand)
 *
 * Migrated from React Context → Zustand. Public hook API unchanged.
 */

import React from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Dispatch, SetStateAction } from "react";
import { zSetter, STORAGE_KEYS, storageService } from "@/shared";
import { UserFilters, ViewFilter } from "../genericFilter/filter.types";

export interface SideBarContextData {
    searchQuery: string;
    setSearchQuery: Dispatch<SetStateAction<string>>;
    moduleName: string;
    setModuleName: Dispatch<SetStateAction<string>>;
    filterViewKey: keyof UserFilters | null;
    setFilterViewKey: Dispatch<SetStateAction<keyof UserFilters | null>>;
    uiFilters: ViewFilter;
    setUIFilters: Dispatch<SetStateAction<ViewFilter>>;
    /** Mobile layout: true for one tick when a tab is opened — VSCodeLayout expands the editor panel */
    mobileTabJustOpened: boolean;
    setMobileTabJustOpened: Dispatch<SetStateAction<boolean>>;
    /** Mobile layout: true while a K review session is active — VSCodeLayout expands editor to 100% */
    mobileReviewActive: boolean;
    setMobileReviewActive: Dispatch<SetStateAction<boolean>>;
}

const _store = create<SideBarContextData>((set, get) => ({
    searchQuery: "",
    setSearchQuery: zSetter("searchQuery", set, get),
    moduleName: storageService.get<string>(`${STORAGE_KEYS.MODULE_NAME}`) ?? "Project",
    setModuleName: zSetter("moduleName", set, get),
    filterViewKey: null,
    setFilterViewKey: zSetter("filterViewKey", set, get),
    uiFilters: {},
    setUIFilters: zSetter("uiFilters", set, get),
    mobileTabJustOpened: false,
    setMobileTabJustOpened: zSetter("mobileTabJustOpened", set, get),
    mobileReviewActive: false,
    setMobileReviewActive: zSetter("mobileReviewActive", set, get),
}));

export const useSideBarStore = () => _store(useShallow((s) => s));
export const getSideBarState = () => _store.getState();
export const subscribeSideBarState = _store.subscribe;
