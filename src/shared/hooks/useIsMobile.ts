import { useMobileStore } from "@/shared";

/**
 * Hook to detect if the app is running on a mobile device
 * Uses MobileStore for centralized state management
 */
export function useIsMobile(): boolean {
    const { isMobile } = useMobileStore();
    return isMobile ?? false;
}
