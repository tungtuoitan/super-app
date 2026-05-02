import React from "react";
import { NoteGridPopupProvider } from "./useNoteGridPopup.store";
import { NoteDetailProvider } from "./useNoteDetail.store";

// NoteGrid store is Zustand-based — no Provider needed.
export const NoteProviders: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <NoteGridPopupProvider>
        <NoteDetailProvider>
            {children}
        </NoteDetailProvider>
    </NoteGridPopupProvider>
);
