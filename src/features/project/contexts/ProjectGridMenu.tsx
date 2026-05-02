import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus as AddIcon, Trash2 as DeleteIcon, RotateCcw as RestoreIcon, Layers as MultiProjectIcon } from "lucide-react";
import { useProjectGridMenuHelper } from "./helpers/useProjectGridMenu.helper";

/**
 * ProjectGridMenu — Pattern B
 * Context menu for project grid/table view.
 */
export function ProjectGridMenu() {
    const { selectedCount, allAreTempProjects, anySelectedDeleted, addProject, openMultiProjectView, softDelete, restore } = useProjectGridMenuHelper();

    return (
        <>
            <MenuItem onClick={addProject}>
                <AddIcon className="w-4 h-4 mr-2" />
                Add Project
            </MenuItem>

            <MenuItem onClick={openMultiProjectView}>
                <MultiProjectIcon className="w-4 h-4 mr-2" />
                Open Multiple Projects
            </MenuItem>

            <MenuDivider />

            {!anySelectedDeleted && selectedCount > 0 && (
                <MenuItem onClick={(e: any) => softDelete((e.syntheticEvent?.target ?? e.target) as HTMLElement)}>
                    <DeleteIcon className="w-4 h-4 mr-2" />
                    Delete
                </MenuItem>
            )}

            {anySelectedDeleted && !allAreTempProjects && (
                <MenuItem onClick={restore}>
                    <RestoreIcon className="w-4 h-4 mr-2" />
                    Restore
                </MenuItem>
            )}
        </>
    );
}
