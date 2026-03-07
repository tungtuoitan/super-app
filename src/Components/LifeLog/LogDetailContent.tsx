/**
 * LogDetailContent - Editor panel for a LifeLog Log (GENERAL only)
 */

import { LogGeneral } from "./LogGeneral";

interface LogDetailContentProps {
    logId: number;
    tabId: string;
}

export function LogDetailContent({ logId, tabId }: LogDetailContentProps) {
    return (
        <div className="flex flex-col h-full w-full bg-background overflow-auto">
            <LogGeneral logId={logId} tabId={tabId} />
        </div>
    );
}
