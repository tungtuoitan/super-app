import React from "react";
import { EditorTabBarProvider } from "@/shell";
import { AuthStoreProvider } from "../auth/Auth.store";
import { AuthCallbackProvider } from "../auth/AuthCallback.store";
import { ActivityBarProvider } from "./ActivityBar.store";
import { ConsoleProvider } from "@/shell";
import { CommandPaletteProvider } from "../commandPallete/useCommandPalette.store";

export const ShellProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <AuthStoreProvider>
        <EditorTabBarProvider>
            <AuthCallbackProvider>
                <ActivityBarProvider>
                    <ConsoleProvider>
                        <CommandPaletteProvider>{children}</CommandPaletteProvider>
                    </ConsoleProvider>
                </ActivityBarProvider>
            </AuthCallbackProvider>
        </EditorTabBarProvider>
    </AuthStoreProvider>
);
