/**
 * Marks console messages as seen while the bottom panel shows the Console tab (#1514),
 * and applies a pending panel tab request (e.g. open straight on Console when there are unread errors).
 */

import { useEffect } from "react";
import { useConsoleHelper } from "@/shared";
import { useActivityBarStore } from "../store/ActivityBar.store";

export const useConsoleSeen = (consoleVisible: boolean) => {
    const { messages } = useConsoleHelper();
    const { setConsoleSeenId } = useActivityBarStore();

    useEffect(() => {
        if (!consoleVisible) return;
        setConsoleSeenId(messages.length > 0 ? messages[messages.length - 1].id : null);
    }, [consoleVisible, messages]);
};

export const usePanelTabRequest = (changeTab: (id: string) => void) => {
    const { panelTabRequest, setPanelTabRequest } = useActivityBarStore();

    useEffect(() => {
        if (!panelTabRequest) return;
        changeTab(panelTabRequest);
        setPanelTabRequest(null);
    }, [panelTabRequest]);
};
