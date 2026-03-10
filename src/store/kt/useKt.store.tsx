import { createContext, useContext, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Knowledge, KnowledgeCard } from "@/types/knowledgeTree.types";

interface KtStoreValue {
    knowledges: Knowledge[];
    setKnowledges: (items: Knowledge[]) => void;
    cards: KnowledgeCard[];
    setCards: (items: KnowledgeCard[]) => void;
    isLoading: boolean;
    setIsLoading: (v: boolean) => void;
    error: string | null;
    setError: (v: string | null) => void;
    // clipboard cho copy/paste card giữa các tab
    clipboardCard: KnowledgeCard | null;
    setClipboardCard: (card: KnowledgeCard | null) => void;
}

const KtContext = createContext<KtStoreValue | null>(null);

export function KtProvider({ children }: PropsWithChildren) {
    const [knowledges, setKnowledges] = useState<Knowledge[]>([]);
    const [cards, setCards] = useState<KnowledgeCard[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clipboardCard, setClipboardCard] = useState<KnowledgeCard | null>(null);

    return (
        <KtContext.Provider value={{
            knowledges, setKnowledges,
            cards, setCards,
            isLoading, setIsLoading,
            error, setError,
            clipboardCard, setClipboardCard,
        }}>
            {children}
        </KtContext.Provider>
    );
}

export function useKtStore() {
    const ctx = useContext(KtContext);
    if (!ctx) throw new Error("useKtStore must be used within KtProvider");
    return ctx;
}
