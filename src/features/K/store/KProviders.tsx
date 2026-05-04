import React from "react";
import { KProvider } from "./useK.store";
import { KFolderDialogProvider } from "./useKNodeDialog.store";
import { KMovingTreeProvider } from "./useKMovingTree.store";

export const KProviders: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <KProvider>
        <KFolderDialogProvider>
            <KMovingTreeProvider>
                {children}
            </KMovingTreeProvider>
        </KFolderDialogProvider>
    </KProvider>
);
