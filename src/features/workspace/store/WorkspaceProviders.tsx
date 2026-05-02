import React from "react";
import { FolderDialogProvider } from "./FolderDialog.store";
import { MovingTreeProvider } from "./MovingTree.store";

// Workspace store is Zustand-based — no Provider needed.
// See ./Workspace.store.tsx
export const WorkspaceProviders: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <FolderDialogProvider>
        <MovingTreeProvider>
            {children}
        </MovingTreeProvider>
    </FolderDialogProvider>
);
