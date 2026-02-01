/**
 * Project Detail UI Context
 * Minimal UI state management for project feature
 * Server state is handled by React Query hooks
 * Tab management is handled by ProjectTabStore
 */

import React, { useContext, createContext, Dispatch, SetStateAction, useState, useRef } from "react";

export interface ProjectDetailContextData {
    // Container refs
    projectNameRef: React.RefObject<HTMLInputElement>;

    // Focus state
    shouldFocusProjectName: boolean;
    setShouldFocusProjectName: Dispatch<SetStateAction<boolean>>;

    // Validation state
    nameError: string;
    setNameError: Dispatch<SetStateAction<string>>;
}

export const projectDetailContextDefaultValue: ProjectDetailContextData = {
    // Container refs
    projectNameRef: { current: null },

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
    // Container refs
    const projectNameRef = useRef<HTMLInputElement>(null);

    // Focus state
    const [shouldFocusProjectName, setShouldFocusProjectName] = useState(false);

    // Validation state
    const [nameError, setNameError] = useState("");

    return (
        <ProjectDetailContext.Provider
            value={{
                // Container refs
                projectNameRef,

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
