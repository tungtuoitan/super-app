import { useEffect, useRef } from "react";
import { useTaskSectionStore } from "../../store/useTaskSection.store";

/**
 * Connects the Reflect tab to the section bar: reports dirty state (lights Save / Discard)
 * and registers the save / discard handlers used by the section Save button and its shortcuts.
 */
export function useTaskReflectHeadless({ isDirty, save, discard }: { isDirty: boolean; save: () => Promise<void>; discard: () => void }) {
    const { builtinSectionHandlersRef, setIsReflectDirty } = useTaskSectionStore();
    const latestRef = useRef({ save, discard });
    latestRef.current = { save, discard };

    useEffect(() => {
        builtinSectionHandlersRef.current.reflect = {
            save: () => latestRef.current.save(),
            discard: () => latestRef.current.discard(),
        };
        return () => { delete builtinSectionHandlersRef.current.reflect; };
    }, [builtinSectionHandlersRef]);

    useEffect(() => {
        setIsReflectDirty(isDirty);
        return () => setIsReflectDirty(false);
    }, [isDirty]);
}
