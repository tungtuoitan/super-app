/**
 * Workspace List View - Displays workspace list grid
 * Shows all workspaces with filtering and management capabilities
 */

import { WsGrid } from '../Workspace/WsGrid';

export function WorkspaceListView() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <WsGrid />
    </div>
  );
}
