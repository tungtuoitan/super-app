/**
 * Mobile UI Context Store
 * Manages mobile-specific UI state
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState, useEffect } from "react";

export interface MobileContextData {
    // Mobile detection
    isMobile: boolean;
    setIsMobile: Dispatch<SetStateAction<boolean>>;
}

export const mobileContextDefaultValue: MobileContextData = {
    isMobile: false,
    setIsMobile: () => {},
};

const MobileContext = createContext<MobileContextData>(mobileContextDefaultValue);

export const useMobileStore = () => {
    const ctx = useContext(MobileContext);
    if (!ctx) {
        throw new Error("useMobileStore must be used within MobileProvider");
    }
    return ctx;
};

export const MobileProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Mobile detection state - breakpoint 768px (tailwind md)
    const [isMobile, setIsMobile] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        return window.innerWidth < 768;
    });

    return (
        <MobileContext.Provider
            value={{
                isMobile,
                setIsMobile,
            }}
        >
            {children}
        </MobileContext.Provider>
    );
};
