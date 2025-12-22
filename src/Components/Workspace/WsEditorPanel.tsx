/**
 * Workspace Editor Panel
 * Editor panel for workspace tabs in VSCodeLayout
 * Toolbar is now shared in VSEditorArea
 */

import React, { useEffect } from 'react';
import type { BaseTab } from '@/types/editor/tab.types';
import { WsDetailDialogContent } from './WsDetailDialogContent';
import { useWsUIStore } from '@/store/ws/useWsUI.store';
import { useWsUIHelper } from '@/hooks/useWsUI.helper';
import { useEditorTabsStore } from '@/store/index';
import { Ws } from '@/store/ws/useWsList.store';
import { constants } from '@/utils/constants';

interface WsEditorPanelProps {
    tab: BaseTab;
}

export function WsEditorPanel({ tab }: WsEditorPanelProps) {
    const { wsHasChanges, selectedWorkspace } = useWsUIStore();
    const { setOpenTabs, openTabs } = useEditorTabsStore();
    
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Sync hasUnsavedChanges AND tab.data with selectedWorkspace state
    useEffect(() => {
        setOpenTabs((prev: BaseTab[]) => prev.map(t => 
            t.id === tab.id 
                ? { 
                    ...t, 
                    hasUnsavedChanges: wsHasChanges,
                    // Sync tab.data with current selectedWorkspace (2-way binding)
                    data: selectedWorkspace || t.data,
                  }
                : t
        ));
    }, [wsHasChanges, selectedWorkspace, tab.id]);

    // Restore scroll position when tab becomes active
    useEffect(() => {
        const viewState = openTabs.find((t: BaseTab) => t.id === tab.id)?.viewState;
        if (contentRef.current && viewState?.scrollTop !== undefined) {
            contentRef.current.scrollTop = viewState.scrollTop;
        }
    }, [tab.id]);

    // Save scroll position when scrolling
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        setOpenTabs((prev: BaseTab[]) => prev.map(t => 
            t.id === tab.id 
                ? { ...t, viewState: { ...t.viewState, scrollTop } }
                : t
        ));
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-[#f6f6f6]">
            {/* Content */}
            <div 
                ref={contentRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto bg-background"
            >
                <WsDetailDialogContent />
            </div>
        </div>
    );
}
