import { useKnowledgeCardStore } from "@/store/kt/KnowledgeCard.store";

export function LevelTabs({ maxLevel }: { maxLevel: number }) {
    const { activeLevel, setActiveLevel } = useKnowledgeCardStore();

    return (
        <div className="flex items-center gap-1">
            <button onClick={() => setActiveLevel(null)}
                className={`text-xs px-2.5 py-1 rounded transition-colors
                    ${activeLevel === null ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}>
                All
            </button>
            {Array.from({ length: maxLevel }, (_, i) => i + 1).map((lvl) => (
                <button key={lvl} onClick={() => setActiveLevel(lvl === activeLevel ? null : lvl)}
                    className={`text-xs px-2.5 py-1 rounded font-mono transition-colors
                        ${activeLevel === lvl ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}>
                    L{lvl}
                </button>
            ))}
        </div>
    );
}
