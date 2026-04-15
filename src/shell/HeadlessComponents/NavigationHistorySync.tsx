/**
 * Navigation History Sync Component
 * Handles localStorage persistence for navigation history
 * - Loads history on mount or userId change
 * - Saves history whenever it changes
 * This component doesn't render anything, just side effects
 */

import { useEffect } from "react";
import { useNavigationHistoryStore } from "@/store/editor/NavigationHistory.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { getStorageKey, HistoryStorage } from "@/shell/hooks/useNavigationHistory.helper";

export const NavigationHistorySync = () => {
    const { past, setPast, present, setPresent, future, setFuture } = useNavigationHistoryStore();
    const { $user } = useAuthStore();

    // Load history from localStorage on mount or userId change
    useEffect(() => {
        const storageKey = getStorageKey($user.userId);
        if (!storageKey) {
            setPast([]);
            setPresent(null);
            setFuture([]);
            return;
        }

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const data: HistoryStorage = JSON.parse(stored);
                setPast(data.past || []);
                setPresent(data.present || null);
                setFuture(data.future || []);
            }
        } catch (error) {
            console.error("Failed to load navigation history from localStorage:", error);
            setPast([]);
            setPresent(null);
            setFuture([]);
        }
    }, [$user.userId, setPast, setPresent, setFuture]);

    // Save history to localStorage whenever it changes
    useEffect(() => {
        const storageKey = getStorageKey($user.userId);
        if (!storageKey) return;

        // Only save if we have at least present or past
        if (!present && past.length === 0) return;

        try {
            const data: HistoryStorage = {
                past,
                present,
                future,
            };
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save navigation history to localStorage:", error);
        }
    }, [past, present, future, $user.userId]);

    // This component doesn't render anything
    return null;
};
