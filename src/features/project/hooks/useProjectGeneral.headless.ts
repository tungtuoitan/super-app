/**
 * ProjectGeneral Headless
 * Side-effects only (useEffect). No UI.
 * Manages form reset key and focus behavior for ProjectGeneral.
 */

import { useEffect, useState } from "react";
import { useProjectDetailStore } from "../store/useProjectDetail.store";
import { useProjectDetailSelector } from "../Selectors/useProjectDetail.selector";

export const useProjectGeneralHeadless = () => {
    const { projectNameRef, shouldFocusProjectName, setShouldFocusProjectName, setNameError } = useProjectDetailStore();
    const { selectedProject } = useProjectDetailSelector();

    // Track form key to force remount of RichTextEditor when project changes
    const [projectKey, setProjectKey] = useState(0);

    // Reset form key and clear name error when switching project
    useEffect(() => {
        if (selectedProject) {
            setProjectKey((prev) => prev + 1);
            setNameError("");
        }
    }, [selectedProject?.id]);

    // Focus on Project Name field when creating new project
    useEffect(() => {
        if (shouldFocusProjectName && projectNameRef.current) {
            setTimeout(() => {
                projectNameRef.current?.focus();
                setShouldFocusProjectName(false);
            }, 100);
        }
    }, [shouldFocusProjectName, projectNameRef]);

    return { projectKey };
};
