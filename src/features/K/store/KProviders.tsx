import React from "react";
import { KProvider } from "./K.store";
import { KFolderDialogProvider } from "./KNodeDialog.store";
import { KMovingTreeProvider } from "./KMovingTree.store";

export const KProviders: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <KProvider>
        <KFolderDialogProvider>
            <KMovingTreeProvider>
                {children}
            </KMovingTreeProvider>
        </KFolderDialogProvider>
    </KProvider>
);
