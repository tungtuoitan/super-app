import React from "react";
import { EditorTabBarProvider } from "@/shell/store/EditorTab.store";

export const ShellProviders: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <EditorTabBarProvider>
                {children}
    </EditorTabBarProvider>
);
