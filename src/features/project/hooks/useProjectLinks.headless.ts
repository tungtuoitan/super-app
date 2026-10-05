/**
 * ProjectLinks Headless — load the project's links when the selected project changes (task #1477).
 */
import { useEffect } from "react";
import { useProjectDetailSelector } from "../Selectors/useProjectDetail.selector";
import { useProjectLinksHelper } from "./useProjectLinks.helper";

export const useProjectLinksHeadless = () => {
    const { selectedProject } = useProjectDetailSelector();
    const { loadProjectLinks } = useProjectLinksHelper();

    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadProjectLinks only touches the zustand store
    useEffect(() => {
        loadProjectLinks(selectedProject?.id ?? 0);
    }, [selectedProject?.id]);
};
