import React from "react";
import { EditorTabBarProvider } from "@/shell";
import { ActivityBarProvider } from "./ActivityBar.store";
import { CommandPaletteProvider } from "../commandPallete/useCommandPalette.store";
import { KeywordProvider } from "../commandPallete/Keyword.store";

export const ShellProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <EditorTabBarProvider>
        <ActivityBarProvider>
            <KeywordProvider>
                <CommandPaletteProvider>{children}</CommandPaletteProvider>
            </KeywordProvider>
        </ActivityBarProvider>
    </EditorTabBarProvider>
);
