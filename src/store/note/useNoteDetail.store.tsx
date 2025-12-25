/**
 * Notes UI Context
 * Minimal UI state management for notes feature
 * Server state is handled by React Query hooks
 * Tab management is handled by NoteTabStore
 */

import {Note} from '@/types/note.types';
import React, { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from 'react';

export interface NoteDetailContextData {
    // Dialog state
    originalNoteRef: React.MutableRefObject<Note | null>;

    // Container refs
    noteNameRef: React.RefObject<HTMLInputElement>;

    // Focus state
    shouldFocusNoteName: boolean;
    setShouldFocusNoteName: Dispatch<SetStateAction<boolean>>;
}

export const noteDetailContextDefaultValue: NoteDetailContextData = {
    // Dialog state
    originalNoteRef: { current: null },

    // Container refs
    noteNameRef: { current: null },

    // Focus state
    shouldFocusNoteName: false,
    setShouldFocusNoteName: () => {},
};

const NoteDetailContext = createContext<NoteDetailContextData>(noteDetailContextDefaultValue);

export const useNoteDetailStore = () => useContext(NoteDetailContext);

export const NoteDetailProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {

    // Container refs
    const noteNameRef = useRef<HTMLInputElement>(null);
    const originalNoteRef = useRef<Note | null>(null);

    // Focus state
    const [shouldFocusNoteName, setShouldFocusNoteName] = useState(false);

    return (
        <NoteDetailContext.Provider
            value={{
                // Dialog state
                originalNoteRef,

                // Container refs
                noteNameRef,

                // Focus state
                shouldFocusNoteName,
                setShouldFocusNoteName,
            }}
        >
            {children}
        </NoteDetailContext.Provider>
    );
}

