/**
 * KKnowledgeEditorPanel - Editor tab wrapper for a K knowledge base
 */

import { useEffect } from "react";
import { useEditorTabsStore } from "@/store/index";
import { KKnowledgeGeneral } from "./KKnowledgeGeneral";
import type { BaseTab } from "@/types/editor/tab.types";
import type { KWsResponse } from "../types/K.types";

interface KKnowledgeEditorPanelProps {
    tab: BaseTab;
}

export function KKnowledgeEditorPanel({ tab }: KKnowledgeEditorPanelProps) {
    const { setOpenTabs } = useEditorTabsStore();
    const knowledge = tab.data as unknown as KWsResponse;

    useEffect(() => {
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === tab.id
                    ? { ...t, hasUnsavedChanges: JSON.stringify(t.data) !== JSON.stringify(t.data0) }
                    : t,
            ),
        );
    }, [tab.data, tab.id, setOpenTabs]);

    return (
        <div className="flex-1 flex flex-col bg-editor-bg overflow-hidden">
            <div className="flex flex-col h-full w-full bg-background overflow-auto">
                <KKnowledgeGeneral knowledgeId={knowledge.id} tabId={tab.id} />
            </div>
        </div>
    );
}
