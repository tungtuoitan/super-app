import React from "react";
import { ControlledMenu } from "@szhsin/react-menu";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import { useOrchestratorContextMenuStore } from "@/shared";
import { contextMenuRegistry } from "./contextMenu.registry";

interface ContextMenuProviderProps {
    children: React.ReactNode;
}

export function OrchestratorContextMenu({ children }: ContextMenuProviderProps) {
    const { isContextMenuOpen, anchorPoint, contextType, setIsContextMenuOpen } = useOrchestratorContextMenuStore();
    const Component = contextMenuRegistry.get(contextType);

    return (
        <>
            {children}
            <ControlledMenu
                state={isContextMenuOpen ? "open" : "closed"}
                anchorPoint={anchorPoint}
                onClose={() => setIsContextMenuOpen(false)}
                menuClassName="context-menu"
                transition
            >
                {Component && <Component />}
            </ControlledMenu>
        </>
    );
}
