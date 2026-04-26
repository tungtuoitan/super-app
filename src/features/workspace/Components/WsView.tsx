/**
 * wsView - Displays ws grid
 * Shows all workspaces with filtering and management capabilities
 */

import { WsGrid } from "@/features/workspace/Components/WsGrid";

export function WsView() {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <WsGrid />
        </div>
    );
}
