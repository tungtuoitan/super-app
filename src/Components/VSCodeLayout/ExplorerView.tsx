/**
 * Explorer View - Workspace tree navigation
 * Extracted from VSSideBar for better separation of concerns
 */

import { useState, useEffect } from 'react';
import { GenericAutoComplete, type IAutoCompleteOptions } from '@/shared/components';
import { WorkspaceTree } from '../Explorer/WorkspaceTree';
import { useWorkspaceOperation } from '@/hooks/explorer/useWorkspaceOperation.helper';

/**
 * Explorer View - WorkspaceTree for folder navigation with workspace selection
 */
export function ExplorerView() {
  const {
    allWorkspaces,
    selectedWorkspaceId,
    isLoadingWorkspaces,
    isLoadingTree,
    loadAllWorkspaces,
    selectWorkspace,
    getCurrentTree,
    reloadCurrentTree,
  } = useWorkspaceOperation();

  const [selectedOption, setSelectedOption] = useState<IAutoCompleteOptions | null>(null);

  // Load workspaces on mount
  useEffect(() => {
    loadAllWorkspaces();
  }, []);

  // Sync selected option with selectedWorkspaceId from store
  useEffect(() => {
    if (selectedWorkspaceId && allWorkspaces.length > 0) {
      const workspace = allWorkspaces.find(ws => ws.id === selectedWorkspaceId);
      if (workspace) {
        setSelectedOption({
          id: workspace.id.toString(),
          label: workspace.name,
          desc: workspace.description || workspace.name,
          active: true
        });
      }
    }
  }, [selectedWorkspaceId, allWorkspaces]);

  // Get current tree data from cache
  const currentTreeData = getCurrentTree();

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
    <div className="h-full overflow-hidden flex flex-col">
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
        ) : !selectedWorkspaceId ? (
          <div className="p-4 text-sm text-muted-foreground">No workspace selected</div>
        ) : isLoadingTree ? (
          <div className="p-4 text-sm text-muted-foreground">Loading tree...</div>
        ) : !currentTreeData ? (
          <div className="p-4 text-sm text-muted-foreground">No tree data available</div>
        ) : (
          <WorkspaceTree 
            workspaceId={selectedWorkspaceId}
            treeData={currentTreeData}
            onRefresh={reloadCurrentTree}
            includeShared={true}
          />
        )}
      </div>
    </div>
  );
}
