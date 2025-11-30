/**
 * Explorer View - Workspace tree navigation
 * Extracted from VSSideBar for better separation of concerns
 */

import { useState, useEffect } from 'react';
import { GenericAutoComplete, type IAutoCompleteOptions } from '@/shared/components';
import { WorkspaceTree } from '../Explorer/WorkspaceTree';
import { useWorkspaceOperation } from '@/hooks/explorer/useWorkspaceOperation.helper';
import { useExplorerStore } from '@/store/explorer/ExplorerStore';

/**
 * Explorer View - WorkspaceTree for folder navigation with workspace selection
 */
export function ExplorerView() {
  // Get state directly from store
  const {
    allWorkspaces,
    currentTree,
    isLoadingWorkspaces,
    isLoadingTree,
  } = useExplorerStore();

  // Get actions from helper
  const {
    loadAllWorkspaces,
    selectWorkspace,
  } = useWorkspaceOperation();

  const [selectedOption, setSelectedOption] = useState<IAutoCompleteOptions | null>(null);

  // Load workspaces on mount
  useEffect(() => {
    loadAllWorkspaces();
  }, []);

  // Sync selected option with currentTree.workspaceId from store
  useEffect(() => {
    if (currentTree?.workspaceId && allWorkspaces.length > 0) {
      const workspace = allWorkspaces.find(ws => ws.id === currentTree.workspaceId);
      if (workspace) {
        setSelectedOption({
          id: workspace.id.toString(),
          label: workspace.name,
          desc: workspace.description || workspace.name,
          active: true
        });
      }
    }
  }, [currentTree?.workspaceId, allWorkspaces]);


  // Convert workspaces to autocomplete options
  const workspaceOptions: IAutoCompleteOptions[] = allWorkspaces.map(ws => ({
    id: ws.id.toString(),
    label: ws.name,
    desc: ws.description || ws.name,
    active: true
  }));

  // Handle workspace selection change
  const handleWorkspaceChange = (_event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => {
    setSelectedOption(newValue);
    
    if (newValue?.id) {
      const workspaceId = parseInt(newValue.id.toString());
      selectWorkspace(workspaceId);
    }
  };


    

  return (
    <div className="h-full overflow-auto flex flex-col">
      {/* Workspace Selector */}
      <div className="px-3 py-2">
        <GenericAutoComplete
          allOptions={workspaceOptions}
          value={selectedOption}
          onChange={handleWorkspaceChange}
          inputProps={{
            name: 'workspace',
            label: '',
            required: false
          }}
          disabled={isLoadingWorkspaces || workspaceOptions.length === 0}
          size="small"
        />
      </div>

      {/* Workspace Tree */}
      <div className="flex-1 overflow-hidden">
        {isLoadingWorkspaces ? (
          <div className="p-4 text-sm text-muted-foreground">Loading workspaces...</div>
        ) : !currentTree?.workspaceId ? (
          <div className="p-4 text-sm text-muted-foreground">No workspace selected</div>
        ) : isLoadingTree ? (
          <div className="p-4 text-sm text-muted-foreground">Loading tree...</div>
        ) : !currentTree ? (
          <div className="p-4 text-sm text-muted-foreground">No tree data available</div>
        ) : (
          <WorkspaceTree />
        )}
      </div>
    </div>
  );
}
