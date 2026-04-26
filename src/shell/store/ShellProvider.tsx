import React from "react";
import { EditorTabBarProvider } from "@/shell/store/EditorTab.store";
import {AuthStoreProvider} from "./Auth.store";
import {AuthCallbackProvider} from "./AuthCallback.store";
import {ActivityBarProvider} from "./ActivityBar.store";
import {ConsoleProvider} from "@/store/useConsole.store";

export const ShellProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <EditorTabBarProvider>
        <AuthStoreProvider>
            <AuthCallbackProvider>
                <ActivityBarProvider>
                    <ConsoleProvider>
                        {children}
                    </ConsoleProvider>
                </ActivityBarProvider>
            </AuthCallbackProvider>
        </AuthStoreProvider>
    </EditorTabBarProvider>
);
