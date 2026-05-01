import React from "react";
import { ControlledMenu } from "@szhsin/react-menu";
import "@szhsin/react-menu/dist/index.css";
import "@szhsin/react-menu/dist/transitions/slide.css";
import {menuContextRegistry} from "./menuContext.registry";
import {useMenuContextStore} from "./MenuContext.store";

interface ContextMenuProviderProps {
    children: React.ReactNode;
}

export function MenuContext({ children }: ContextMenuProviderProps) {
    const { isMenuContextOpen, anchorPoint, contextType, setIsMenuContextOpen } = useMenuContextStore();
    const Component = menuContextRegistry.get(contextType);

    return (
        <>
            {children}
            <ControlledMenu
                state={isMenuContextOpen ? "open" : "closed"}
                anchorPoint={anchorPoint}
                onClose={() => setIsMenuContextOpen(false)}
                menuClassName="context-menu"
                transition
            >
                {Component && <Component />}
            </ControlledMenu>
        </>
    );
}
