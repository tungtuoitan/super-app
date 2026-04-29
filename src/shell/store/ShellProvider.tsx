import React from "react";
import { EditorTabBarProvider } from "@/shell";
import { AuthStoreProvider } from "./Auth.store";
import { AuthCallbackProvider } from "./AuthCallback.store";
import { ActivityBarProvider } from "./ActivityBar.store";
import { ConsoleProvider } from "@/shell";
import { CommandPaletteProvider } from "./useCommandPalette.store";

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
