import React from "react";
import { NoteGridPopupProvider } from "./useNoteGridPopup.store";
import { NoteDetailProvider } from "./useNoteDetail.store";
import { NoteGridProvider } from "./useNoteGrid.store";

export const NoteProviders: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <NoteGridPopupProvider>
        <NoteDetailProvider>
            <NoteGridProvider>
                {children}
            </NoteGridProvider>
        </NoteDetailProvider>
    </NoteGridPopupProvider>
);
