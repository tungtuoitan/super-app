/**
 * Current Project Store
 * Holds the project context for the currently active editor tab.
 * Written by ProjectEditorPanelHeadless; read by task selectors/helpers
 * that need project context without importing from the project feature directly.
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";
import type { Project } from "@/types/project.types";

export interface CurrentProjectContextData {
    projectId: number | null;
    setProjectId: Dispatch<SetStateAction<number | null>>;
    currentProject: Project | null;
    setCurrentProject: Dispatch<SetStateAction<Project | null>>;
    projects: Project[];
    setProjects: Dispatch<SetStateAction<Project[]>>;
}

const defaultValue: CurrentProjectContextData = {
    projectId: null,
    setProjectId: () => {},
    currentProject: null,
    setCurrentProject: () => {},
    projects: [],
    setProjects: () => {},
};

const CurrentProjectStore = createContext<CurrentProjectContextData>(defaultValue);

export const useCurrentProjectStore = () => useContext(CurrentProjectStore);

export const CurrentProjectProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [projectId, setProjectId] = useState<number | null>(null);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);

    return (
        <CurrentProjectStore.Provider value={{ projectId, setProjectId, currentProject, setCurrentProject, projects, setProjects }}>
            {children}
        </CurrentProjectStore.Provider>
    );
};
