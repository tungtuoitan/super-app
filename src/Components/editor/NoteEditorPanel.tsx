/**
 * Note Editor Panel
 * Reuses NoteDetailDialogContent for editor area tabs
 * Toolbar is now shared in VSEditorArea
 */

import React, {useEffect} from 'react';
import {NoteDetailDialogContent} from '@/Components/Notes/dialogs/NoteDetailDialogContent';
import {useEditorActionsHelper} from '@/hooks/useEditorActions.helper';
import {useEditorTabsStore} from '@/store/index';
import {useNoteUIStore} from '@/store/note/useNoteUI.store';
import {BaseTab} from '@/types/editor/tab.types';

interface NoteEditorPanelProps {
    tab: BaseTab;
}

export function NoteEditorPanel({ tab }: NoteEditorPanelProps) {
    const { syncTabChangeState } = useEditorActionsHelper();
    const { noteHasChanges } = useNoteUIStore();
    const { setOpenTabs, openTabs } = useEditorTabsStore();
    
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Sync noteHasChanges with tab state
    useEffect(() => {
        syncTabChangeState(tab.id);
    }, [noteHasChanges, tab.id]);

    // Restore scroll position when tab becomes active
    useEffect(() => {
        const viewState = openTabs.find((t: BaseTab) => t.id === tab.id)?.viewState
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
    }

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-[#f6f6f6]">
            {/* Content */}
            <div 
                ref={contentRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto bg-background"
            >
                <NoteDetailDialogContent />
            </div>
        </div>
    );
}
