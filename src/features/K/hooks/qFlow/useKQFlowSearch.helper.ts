import { useReactFlow } from "@xyflow/react";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import type { KQFlowNodeData } from "@/features/K/types/kQFlow.type";
import { removeDiacritics } from "@/shared";

export const useKQFlowSearchHelper = () => {
    const {
        flowNodes,
        editingNodeId,
        isSearchOpen, setIsSearchOpen,
        searchQuery, setSearchQuery,
        searchMatchIds, setSearchMatchIds,
        searchActiveIndex, setSearchActiveIndex,
    } = useKQFlowStore();
    const { setCenter, getZoom } = useReactFlow();

    const navigateToNode = (nodeId: string) => {
        const node = flowNodes.find((n) => n.id === nodeId);
        if (!node) return;
        const w = (node.measured?.width as number | undefined) ?? 280;
        const h = (node.measured?.height as number | undefined) ?? 120;
        setCenter(
            node.position.x + w / 2,
            node.position.y + h / 2,
            { zoom: Math.max(getZoom(), 0.75), duration: 300 },
        );
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchMatchIds([]);
            setSearchActiveIndex(0);
            return;
        }
        const q = removeDiacritics(query).toLowerCase();
        const matchIds = flowNodes
            .filter((n) => {
                const { question } = n.data as KQFlowNodeData;
                const text = removeDiacritics(
                    (question?.question ?? "") + " " + (question?.answer ?? ""),
                ).toLowerCase();
                return text.includes(q);
            })
            .map((n) => n.id);
        setSearchMatchIds(matchIds);
        setSearchActiveIndex(0);
        if (matchIds.length > 0) navigateToNode(matchIds[0]);
    };

    const handleNext = () => {
        if (searchMatchIds.length === 0) return;
        const next = (searchActiveIndex + 1) % searchMatchIds.length;
        setSearchActiveIndex(next);
        navigateToNode(searchMatchIds[next]);
    };

    const handlePrev = () => {
        if (searchMatchIds.length === 0) return;
        const prev = (searchActiveIndex - 1 + searchMatchIds.length) % searchMatchIds.length;
        setSearchActiveIndex(prev);
        navigateToNode(searchMatchIds[prev]);
    };

    const handleOpen = () => {
        if (editingNodeId !== null) return;
        setIsSearchOpen(true);
    };

    const handleClose = () => {
        setIsSearchOpen(false);
        setSearchQuery("");
        setSearchMatchIds([]);
        setSearchActiveIndex(0);
    };

    return {
        isSearchOpen,
        searchQuery,
        searchMatchIds,
        searchActiveIndex,
        handleSearch,
        handleNext,
        handlePrev,
        handleOpen,
        handleClose,
    };
};
