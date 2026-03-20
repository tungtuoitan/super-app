/**
 * LogItem Helper Hook
 * Long-press detection + action handlers for a single log item.
 * Returns functions that accept logId — no params on the hook itself.
 */

import { useRef, useCallback } from "react";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { useLifeLogLogHelper } from "@/hooks/lifeLog/useLifeLogLog.helper";
import { useLifeLogTabHelper } from "@/hooks/lifeLog/useLifeLogTab.helper";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import { constants } from "@/utils/constants";
import { LONG_PRESS_MS } from "@/utils/lifeLog.constants";

export function useLogItemHelper() {
    const { logs } = useLifeLogStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { deleteLog } = useLifeLogLogHelper();
    const { openLogTab } = useLifeLogTabHelper();

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPressRef = useRef(false);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const activeLogIdRef = useRef<number | null>(null);

    const getLog = useCallback((logId: number) => {
        return logs.find((l) => l.id === logId);
    }, [logs]);

    const openMenu = useCallback((logId: number, e: React.MouseEvent) => {
        showContextMenu(e, constants.contextMenu.contextMenuTypes.lifeLogLog, {
            onDelete: () => deleteLog(logId),
        });
    }, [showContextMenu, deleteLog]);

    const handleClick = useCallback((logId: number) => {
        if (didLongPressRef.current) return;
        const log = getLog(logId);
        if (log) openLogTab(log);
    }, [getLog, openLogTab]);

    const startPress = useCallback((logId: number, e: React.MouseEvent | React.TouchEvent) => {
        didLongPressRef.current = false;
        activeLogIdRef.current = logId;
        const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        if ("touches" in e) touchStartRef.current = { x: clientX, y: clientY };
        timerRef.current = setTimeout(() => {
            didLongPressRef.current = true;
            openMenu(logId, { preventDefault: () => {}, stopPropagation: () => {}, clientX, clientY } as React.MouseEvent);
        }, LONG_PRESS_MS);
    }, [openMenu]);

    const cancelPress = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        touchStartRef.current = null;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchStartRef.current || !timerRef.current) return;
        const dx = e.touches[0].clientX - touchStartRef.current.x;
        const dy = e.touches[0].clientY - touchStartRef.current.y;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    return {
        openMenu,
        handleClick,
        startPress,
        cancelPress,
        handleTouchMove,
    };
}
