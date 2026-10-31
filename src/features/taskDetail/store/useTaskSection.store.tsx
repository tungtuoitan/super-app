/**
 * Task Section Store
 * UI state for section-level concerns shared across child components.
 * Eliminates prop-drilling of focusTrigger, commentFilter, dirty state, etc.
 */

import React, { useContext, createContext, useState, useRef, useCallback, Dispatch, SetStateAction } from "react";
import type { CommentFilterType } from "../types/taskComment.types";
import { storageService, STORAGE_KEYS } from "@/shared";

export interface CustomTabHandler {
    save: () => Promise<void>;
    discard: () => void;
}

export interface TaskSectionContextData {
    // ── Description ──────────────────────────────────────────────────────────
    descKey: number;
    setDescKey: Dispatch<SetStateAction<number>>;
    descDirty: boolean;
    setDescDirty: (v: boolean) => void;
    /** Tracks last-saved note value — mutated without re-render */
    savedNoteRef: React.MutableRefObject<string>;

    // ── Focus triggers (auto-increment to trigger RichTextEditor focus) ──────
    descFocusTrigger: number;
    triggerDescFocus: () => void;
    commentFocusTrigger: number;
    triggerCommentFocus: () => void;
    commentLoadTrigger: number;
    triggerCommentLoad: () => void;
    customFocusTrigger: number;
    triggerCustomFocus: () => void;

    // ── Comment filter (persisted to localStorage) ───────────────────────────
    commentFilter: CommentFilterType;
    setCommentFilter: (v: CommentFilterType) => void;
    commentShowDetail: boolean;
    setCommentShowDetail: (v: boolean) => void;

    // ── Custom tab dirty state + imperative handlers ──────────────────────────
    customTabDirty: boolean;
    setCustomTabDirty: (v: boolean) => void;
    /** Mutable ref — custom tabs register/unregister their save/discard handlers */
    customTabHandlersRef: React.MutableRefObject<Record<string, CustomTabHandler>>;
    /** Mutable ref — process/checklist providers register their save/discard handlers */
    builtinSectionHandlersRef: React.MutableRefObject<Partial<Record<'process' | 'checklist' | 'reflect', CustomTabHandler>>>;

    // ── Section dirty flags (set by local checklist/process providers) ────────
    isChecklistDirty: boolean;
    setIsChecklistDirty: (v: boolean) => void;
    isProcessDirty: boolean;
    setIsProcessDirty: (v: boolean) => void;
    isReflectDirty: boolean;
    setIsReflectDirty: (v: boolean) => void;

    // ── "Saved" toast over the Save/Discard buttons ───────────────────────────
    /** Counter — each increment plays the toast once */
    savedToastKey: number;
    triggerSavedToast: () => void;
    /** True from the moment a section save is requested until the section turns clean */
    saveRequestedRef: React.MutableRefObject<boolean>;
    /** Same for Discard — only set when the user pressed Discard (or Esc), not on tab switches */
    discardedToastKey: number;
    triggerDiscardedToast: () => void;
    discardRequestedRef: React.MutableRefObject<boolean>;

    // ── Comment scroll container ref ─────────────────────────────────────────
    scrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
}

const nullRef = <T,>(v: T): React.MutableRefObject<T> => ({ current: v });

export const taskSectionContextDefaultValue: TaskSectionContextData = {
    descKey: 0,
    setDescKey: () => {},
    descDirty: false,
    setDescDirty: () => {},
    savedNoteRef: nullRef(""),
    descFocusTrigger: 0,
    triggerDescFocus: () => {},
    commentFocusTrigger: 0,
    triggerCommentFocus: () => {},
    commentLoadTrigger: 0,
    triggerCommentLoad: () => {},
    customFocusTrigger: 0,
    triggerCustomFocus: () => {},
    commentFilter: "all",
    setCommentFilter: () => {},
    commentShowDetail: false,
    setCommentShowDetail: () => {},
    customTabDirty: false,
    setCustomTabDirty: () => {},
    customTabHandlersRef: nullRef({}),
    builtinSectionHandlersRef: nullRef({}),
    isChecklistDirty: false,
    setIsChecklistDirty: () => {},
    isProcessDirty: false,
    setIsProcessDirty: () => {},
    isReflectDirty: false,
    setIsReflectDirty: () => {},
    savedToastKey: 0,
    triggerSavedToast: () => {},
    saveRequestedRef: nullRef(false),
    discardedToastKey: 0,
    triggerDiscardedToast: () => {},
    discardRequestedRef: nullRef(false),
    scrollContainerRef: nullRef(null),
};

export const TaskSectionStore = createContext<TaskSectionContextData>(taskSectionContextDefaultValue);

export const useTaskSectionStore = () => useContext(TaskSectionStore);

export const TaskSectionProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [descKey, setDescKey] = useState(0);
    const [descDirty, setDescDirtyState] = useState(false);
    const savedNoteRef = useRef<string>("");

    const [descFocusTrigger, setDescFocusTrigger] = useState(0);
    const [commentFocusTrigger, setCommentFocusTrigger] = useState(0);
    const [commentLoadTrigger, setCommentLoadTrigger] = useState(0);
    const [customFocusTrigger, setCustomFocusTrigger] = useState(0);

    const [commentFilter, setCommentFilterState] = useState<CommentFilterType>(
        () => storageService.get<CommentFilterType>(STORAGE_KEYS.COMMENT_FILTER) ?? "all",
    );
    const [commentShowDetail, setCommentShowDetailState] = useState(
        () => storageService.get<boolean>(STORAGE_KEYS.COMMENT_SHOW_DETAIL) ?? false,
    );

    const [customTabDirty, setCustomTabDirtyState] = useState(false);
    const customTabHandlersRef = useRef<Record<string, CustomTabHandler>>({});
    const builtinSectionHandlersRef = useRef<Partial<Record<'process' | 'checklist' | 'reflect', CustomTabHandler>>>({});
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    const [isChecklistDirty, setIsChecklistDirtyState] = useState(false);
    const [isProcessDirty, setIsProcessDirtyState] = useState(false);
    const [isReflectDirty, setIsReflectDirtyState] = useState(false);
    const [savedToastKey, setSavedToastKey] = useState(0);
    const saveRequestedRef = useRef(false);
    const [discardedToastKey, setDiscardedToastKey] = useState(0);
    const discardRequestedRef = useRef(false);

    const setDescDirty = (v: boolean) => setDescDirtyState(v)
    const triggerDescFocus = () => setDescFocusTrigger((p) => p + 1)
    const triggerCommentFocus = () => setCommentFocusTrigger((p) => p + 1)
    const triggerCommentLoad = () => setCommentLoadTrigger((p) => p + 1)
    const triggerCustomFocus = () => setCustomFocusTrigger((p) => p + 1)

    const setCommentFilter = (v: CommentFilterType) => {
        setCommentFilterState(v);
        storageService.set(STORAGE_KEYS.COMMENT_FILTER, v);
    }

    const setCommentShowDetail = (v: boolean) => {
        setCommentShowDetailState(v);
        storageService.set(STORAGE_KEYS.COMMENT_SHOW_DETAIL, v);
    }

    const setCustomTabDirty = (v: boolean) => setCustomTabDirtyState(v)
    const setIsChecklistDirty = (v: boolean) => setIsChecklistDirtyState(v)
    const setIsProcessDirty = (v: boolean) => setIsProcessDirtyState(v)
    const setIsReflectDirty = (v: boolean) => setIsReflectDirtyState(v)
    const triggerSavedToast = () => setSavedToastKey((p) => p + 1)
    const triggerDiscardedToast = () => setDiscardedToastKey((p) => p + 1)

    return (
        <TaskSectionStore.Provider value={{
            descKey, setDescKey,
            descDirty, setDescDirty,
            savedNoteRef,
            descFocusTrigger, triggerDescFocus,
            commentFocusTrigger, triggerCommentFocus,
            commentLoadTrigger, triggerCommentLoad,
            customFocusTrigger, triggerCustomFocus,
            commentFilter, setCommentFilter,
            commentShowDetail, setCommentShowDetail,
            customTabDirty, setCustomTabDirty,
            customTabHandlersRef,
            builtinSectionHandlersRef,
            isChecklistDirty, setIsChecklistDirty,
            isProcessDirty, setIsProcessDirty,
            isReflectDirty, setIsReflectDirty,
            savedToastKey, triggerSavedToast, saveRequestedRef,
            discardedToastKey, triggerDiscardedToast, discardRequestedRef,
            scrollContainerRef,
        }}>
            {children}
        </TaskSectionStore.Provider>
    );
};
