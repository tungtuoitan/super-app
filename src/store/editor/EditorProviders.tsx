import React from "react";
import { EditorTabProvider } from "@/store/editor/EditorTab.store";
import { EditorProvider } from "@/store/editor/Editor.store";
import { EditorToolbarProvider } from "@/store/editor/EditorToolbar.store";

export const EditorProviders: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <EditorTabProvider>
        <EditorProvider>
            <EditorToolbarProvider>
                {children}
            </EditorToolbarProvider>
        </EditorProvider>
    </EditorTabProvider>
);
