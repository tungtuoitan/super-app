/**
 * Notes UI Context
 * Minimal UI state management for notes feature
 * Server state is handled by React Query hooks
 * Tab management is handled by NoteTabStore
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from "react";
import type * as _monaco from "monaco-editor";

export interface NoteDetailContextData {
    // Container refs
    noteNameRef: React.RefObject<HTMLInputElement>;

    // Focus state
    shouldFocusNoteName: boolean;
    setShouldFocusNoteName: Dispatch<SetStateAction<boolean>>;

    // Validation state
    nameError: string;
    setNameError: Dispatch<SetStateAction<string>>;

    displayDesc: string | null;
    setDisplayDesc: Dispatch<SetStateAction<string | null>>;
    editorRef: React.MutableRefObject<_monaco.editor.IStandaloneCodeEditor | null>;
    decorationsRef: React.MutableRefObject<string[]>;
    disposablesRef: React.MutableRefObject<_monaco.IDisposable[]>;
    $miRef: any;
    isMounted: boolean;
    setIsMounted: Dispatch<SetStateAction<boolean>>;
    editorMountCount: number;
    setEditorMountCount: Dispatch<SetStateAction<number>>;
}

export const noteDetailContextDefaultValue: NoteDetailContextData = {
    // Container refs
    noteNameRef: { current: null },

    // Focus state
    shouldFocusNoteName: false,
    setShouldFocusNoteName: () => {},

    // Validation state
    nameError: "",
    setNameError: () => {},

    displayDesc: "",
    setDisplayDesc: () => {},
    editorRef: { current: null },
    decorationsRef: { current: [] },
    disposablesRef: { current: [] },
    $miRef: null,
    isMounted: false,
    setIsMounted: () => {},
    editorMountCount: 0,
    setEditorMountCount: () => {},
};

const NoteDetailContext = createContext<NoteDetailContextData>(noteDetailContextDefaultValue);

export const useNoteDetailStore = () => useContext(NoteDetailContext);

export const NoteDetailProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Container refs
    const noteNameRef = useRef<HTMLInputElement>(null);

    // Focus state
    const [shouldFocusNoteName, setShouldFocusNoteName] = useState(false);

    // Validation state
    const [nameError, setNameError] = useState("");

    const [displayDesc, setDisplayDesc] = useState<string | null>(null);
    const editorRef = useRef<_monaco.editor.IStandaloneCodeEditor | null>(null);
    const decorationsRef = useRef<string[]>([]);
    const disposablesRef = useRef<_monaco.IDisposable[]>([]);
    // const $miRef = useRef<any>(useMonaco()); // khởi tạo ở đây vẫn bị null
    const $miRef = useRef<any>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [editorMountCount, setEditorMountCount] = useState(0);

    return (
        <NoteDetailContext.Provider
            value={{
                // Container refs
                noteNameRef,

                // Focus state
                shouldFocusNoteName,
                setShouldFocusNoteName,

                // Validation state
                nameError,
                setNameError,

                displayDesc,
                setDisplayDesc,
                editorRef,
                decorationsRef,
                disposablesRef,
                $miRef,
                isMounted,
                setIsMounted,
                editorMountCount,
                setEditorMountCount,
            }}
        >
            {children}
        </NoteDetailContext.Provider>
    );
};
