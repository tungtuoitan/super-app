/**
 * Project Detail UI Context
 * Minimal UI state management for project feature
 * Server state is handled by React Query hooks
 * Tab management is handled by ProjectTabStore
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from "react";

export interface ProjectDetailContextData {
    // Current project ID (set by ProjectEditorPanel)
    projectId: number;
    setProjectId: Dispatch<SetStateAction<number>>;

    // Current editor tab ID (set by ProjectEditorPanel)
    tabId: string;
    setTabId: Dispatch<SetStateAction<string>>;

    // Container refs
    projectNameRef: React.RefObject<HTMLInputElement>;
    contentRef: React.RefObject<HTMLDivElement>;

    // Focus state
    shouldFocusProjectName: boolean;
    setShouldFocusProjectName: Dispatch<SetStateAction<boolean>>;

    // Validation state
    nameError: string;
    setNameError: Dispatch<SetStateAction<string>>;
}

export const projectDetailContextDefaultValue: ProjectDetailContextData = {
    // Current project ID
    projectId: 0,
    setProjectId: () => {},

    // Current editor tab ID
    tabId: "",
    setTabId: () => {},

    // Container refs
    projectNameRef: { current: null },
    contentRef: { current: null },

    // Focus state
    shouldFocusProjectName: false,
    setShouldFocusProjectName: () => {},

    // Validation state
    nameError: "",
    setNameError: () => {},
};

const ProjectDetailContext = createContext<ProjectDetailContextData>(projectDetailContextDefaultValue);

export const useProjectDetailStore = () => useContext(ProjectDetailContext);

export const ProjectDetailProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    // Current project ID
    const [projectId, setProjectId] = useState(0);

    // Current editor tab ID
    const [tabId, setTabId] = useState("");

    // Container refs
    const projectNameRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Focus state
    const [shouldFocusProjectName, setShouldFocusProjectName] = useState(false);

    // Validation state
    const [nameError, setNameError] = useState("");

    return (
        <ProjectDetailContext.Provider
            value={{
                // Current project ID
                projectId,
                setProjectId,

                // Current editor tab ID
                tabId,
                setTabId,

                // Container refs
                projectNameRef,
                contentRef,

                // Focus state
                shouldFocusProjectName,
                setShouldFocusProjectName,

                // Validation state
                nameError,
                setNameError,
            }}
        >
            {children}
        </ProjectDetailContext.Provider>
    );
};
