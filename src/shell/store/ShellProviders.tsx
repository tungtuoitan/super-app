import React from "react";
import { EditorTabProvider } from "@/shell/store/EditorTab.store";

export const ShellProviders: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <EditorTabProvider>
                {children}
    </EditorTabProvider>
);
