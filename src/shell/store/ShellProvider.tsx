import React from "react";
import { ActivityBarProvider } from "./ActivityBar.store";
import { CommandPaletteProvider } from "../commandPallete/useCommandPalette.store";
import { KeywordProvider } from "../../shared/keyword/Keyword.store";
import { SideBarProvider } from "./SideBar.store";
import {EditorTabBarProvider} from "./EditorTab.store";

export const ShellProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <SideBarProvider>
        <EditorTabBarProvider>
            <ActivityBarProvider>
                <KeywordProvider>
                    <CommandPaletteProvider>{children}</CommandPaletteProvider>
                </KeywordProvider>
            </ActivityBarProvider>
        </EditorTabBarProvider>
    </SideBarProvider>
);
