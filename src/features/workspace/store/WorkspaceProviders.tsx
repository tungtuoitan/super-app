import React from "react";
import { WorkspaceProvider } from "./Workspace.store";
import { FolderDialogProvider } from "./FolderDialog.store";
import { MovingTreeProvider } from "./MovingTree.store";

export const WorkspaceProviders: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <WorkspaceProvider>
        <FolderDialogProvider>
            <MovingTreeProvider>
                {children}
            </MovingTreeProvider>
        </FolderDialogProvider>
    </WorkspaceProvider>
);
