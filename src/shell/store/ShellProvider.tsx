import React from "react";
import { EditorTabBarProvider } from "@/shell";
import { ActivityBarProvider } from "./ActivityBar.store";
import { CommandPaletteProvider } from "../commandPallete/useCommandPalette.store";

export const ShellProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
        <EditorTabBarProvider>
                <ActivityBarProvider>
                        <CommandPaletteProvider>{children}</CommandPaletteProvider>
                </ActivityBarProvider>
        </EditorTabBarProvider>
);
