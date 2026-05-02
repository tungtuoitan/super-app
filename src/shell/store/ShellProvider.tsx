import React from "react";
import { ActivityBarProvider } from "./ActivityBar.store";
import { CommandPaletteProvider } from "../commandPallete/useCommandPalette.store";

// EditorTabBar, Keyword, SideBar stores are Zustand-based — no Provider needed.
export const ShellProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <ActivityBarProvider>
        <CommandPaletteProvider>{children}</CommandPaletteProvider>
    </ActivityBarProvider>
);
