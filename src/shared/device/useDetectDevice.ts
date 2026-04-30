import { useDeviceStore } from "@/shared";
import { useEffect } from "react";

/**
 * Hook to detect if the app is running on a mobile device
 * Uses MobileStore for centralized state management
 */
export function useDetectDevice() {
    const { setIsMobile } = useDeviceStore();
    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);
    return null;
}
