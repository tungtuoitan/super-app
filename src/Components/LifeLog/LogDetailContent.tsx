/**
 * LogDetailContent - Editor panel for a LifeLog Log (GENERAL only)
 */

import { LogGeneral } from "./LogGeneral";

export function LogDetailContent() {
    return (
        <div className="flex flex-col h-full w-full bg-background overflow-auto">
            <LogGeneral />
        </div>
    );
}
