/**
 * ProjectView - Displays project grid
 * Shows all projects with filtering and management capabilities
 */

import { ProjectGrid } from "../Project/ProjectGrid";

export function ProjectView() {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <ProjectGrid />
        </div>
    );
}
