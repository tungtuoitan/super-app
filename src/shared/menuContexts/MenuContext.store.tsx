/**
 * Context Menu Store
 * React Context store for managing context menu state
 * Pattern: Separate store from business logic (similar to EditorTabBarStore)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";

export interface MenuContextPosition {
    x: number;
    y: number;
}

export type MenuContextType = string;

export interface MenuContextStoreData {
    isMenuContextOpen: boolean;
    setIsMenuContextOpen: Dispatch<SetStateAction<boolean>>;
    anchorPoint: MenuContextPosition;
    setAnchorPoint: Dispatch<SetStateAction<MenuContextPosition>>;
    contextType: MenuContextType;
    setContextType: Dispatch<SetStateAction<MenuContextType>>;
    contextData: any | null;
    setContextData: Dispatch<SetStateAction<any | null>>;
}

export const menuContextStoreDefaultValue: MenuContextStoreData = {
    isMenuContextOpen: false,
    setIsMenuContextOpen: () => {},
    anchorPoint: { x: 0, y: 0 },
    setAnchorPoint: () => {},
    contextType: "default",
    setContextType: () => {},
    contextData: null,
    setContextData: () => {},
};

export const MenuContextStore = createContext<MenuContextStoreData>(menuContextStoreDefaultValue);

export const useMenuContextStore = () => useContext(MenuContextStore);

export const MenuContextStoreProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isMenuContextOpen, setIsMenuContextOpen] = useState<boolean>(false);
    const [anchorPoint, setAnchorPoint] = useState<MenuContextPosition>({ x: 0, y: 0 });
    const [contextType, setContextType] = useState<MenuContextType>("default");
    const [contextData, setContextData] = useState<any | null>(null);

    return (
        <MenuContextStore.Provider
            value={{
                isMenuContextOpen,
                setIsMenuContextOpen,
                anchorPoint,
                setAnchorPoint,
                contextType,
                setContextType,
                contextData,
                setContextData,
            }}
        >
            {children}
        </MenuContextStore.Provider>
    );
};
