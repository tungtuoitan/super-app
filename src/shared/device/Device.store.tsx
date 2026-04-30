/**
 * Mobile UI Context Store
 * Manages mobile-specific UI state
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState, useEffect } from "react";

export interface DeviceContextData {
    // Mobile detection
    isMobile: boolean;
    setIsMobile: Dispatch<SetStateAction<boolean>>;
}

export const deviceContextDefaultValue: DeviceContextData = {
    isMobile: false,
    setIsMobile: () => {},
};

const DeviceContext = createContext<DeviceContextData>(deviceContextDefaultValue);

export const useDeviceStore = () => {
    const ctx = useContext(DeviceContext);
    if (!ctx) {
        throw new Error("useDeviceStore must be used within DeviceProvider");
    }
    return ctx;
};

export const DeviceProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Mobile detection state - breakpoint 768px (tailwind md)
    const [isMobile, setIsMobile] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        return window.innerWidth < 768;
    });

    return (
        <DeviceContext.Provider
            value={{
                isMobile,
                setIsMobile,
            }}
        >
            {children}
        </DeviceContext.Provider>
    );
};
