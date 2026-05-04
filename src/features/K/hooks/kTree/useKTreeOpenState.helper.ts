import { useCallback, useEffect, useRef, useState } from "react";
import { useKStore } from "@/features/K/store/K.store";
import { storageService, STORAGE_KEYS } from "@/shared";

/**
 * Persists the open/closed state of kTree nodes to localStorage.
 *
 * - On knowledge switch: loads saved open IDs and imperatively restores them.
 * - onToggle: flips the ID in the tracked set and saves to storage.
 *
 * Returns:
 *   handleToggle   — pass to <Tree onToggle={...}>
 *   hasSavedState  — true if there is a stored state for the current knowledge
 *                    (use this to skip the default auto-expand root behaviour)
 */
export function useKTreeOpenState() {
    const { currentK, _treeRef } = useKStore();

    const [openIds, setOpenIds] = useState<Set<string>>(new Set());
    const restoredForKId = useRef<number | null>(null);

    // Load saved IDs whenever the active knowledge changes
    useEffect(() => {
        if (!currentK?.id) return;
        restoredForKId.current = null;
        const saved = storageService.get<string[]>(`${STORAGE_KEYS.K_TREE_OPEN_IDS}_${currentK.id}`);
        setOpenIds(new Set(saved ?? []));
    }, [currentK?.id]);

    // Imperatively open the saved nodes once the tree is ready
    useEffect(() => {
        if (!currentK?.id || openIds.size === 0) return;
        if (restoredForKId.current === currentK.id) return;

        const timer = setTimeout(() => {
            if (!_treeRef.current) return;
            openIds.forEach(id => {
                const node = _treeRef.current?.get(id);
                if (node && !node.isOpen) node.open();
            });
            restoredForKId.current = currentK.id;
        }, 150);

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openIds, currentK?.id]);

    // Called by <Tree onToggle>: toggles the id in the set and persists
    const handleToggle = useCallback((id: string) => {
        if (!currentK?.id) return;
        setOpenIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            storageService.set(`${STORAGE_KEYS.K_TREE_OPEN_IDS}_${currentK.id}`, [...next]);
            return next;
        });
    }, [currentK?.id]);

    return { handleToggle, hasSavedState: openIds.size > 0 };
}
