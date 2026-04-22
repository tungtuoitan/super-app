import React from "react";
import { ProjectProvider } from "./useProject.store";
import { ProjectDetailProvider } from "./useProjectDetail.store";

export const ProjectProviders: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
    <ProjectProvider>
        <ProjectDetailProvider>
            {children}
        </ProjectDetailProvider>
    </ProjectProvider>
);
