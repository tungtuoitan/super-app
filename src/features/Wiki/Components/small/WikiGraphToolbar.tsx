import { Search, RefreshCw, Plus, Bookmark, BookmarkCheck } from "lucide-react";

interface Props {
    searchText: string;
    setSearchText: (v: string) => void;
    selectedCount: number;
    allSelectedMarked: boolean;
    canMarkMore: boolean;
    onAutoLayout: () => void;
    onToggleMark: () => void;
    onAddKeyword: () => void;
    onInsert: () => void;
}

export default function WikiGraphToolbar({
    searchText, setSearchText, selectedCount, allSelectedMarked, canMarkMore,
    onAutoLayout, onToggleMark, onAddKeyword, onInsert,
}: Props) {
    return (
        <div className="flex items-center gap-1 px-2.5 py-2 border-b border-sa-border flex-shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 pointer-events-none" />
                    <input
                        className="w-full h-7 bg-transparent border border-sa-border-strong rounded-md pl-7 pr-2 text-[13px] text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground transition-colors duration-100"
                        placeholder="Search keywords…"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                    />
                </div>
                <button
                    onClick={onAutoLayout}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-sa-hover-strong hover:text-foreground transition-colors duration-100"
                    title="Auto layout"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {selectedCount > 0 && (
                    <button
                        onClick={onToggleMark}
                        disabled={!allSelectedMarked && !canMarkMore}
                        className={[
                            "w-7 h-7 flex items-center justify-center rounded-md transition-colors duration-100",
                            allSelectedMarked
                                ? "bg-sa-amber/15 text-sa-amber-ink hover:bg-sa-amber/25"
                                : canMarkMore
                                    ? "text-muted-foreground hover:bg-sa-hover-strong hover:text-sa-amber-ink"
                                    : "text-muted-foreground cursor-not-allowed opacity-40",
                        ].join(" ")}
                        title={
                            allSelectedMarked
                                ? "Unmark selected"
                                : canMarkMore
                                    ? "Mark selected (max 5)"
                                    : "Max 5 nodes can be marked"
                        }
                    >
                        {allSelectedMarked
                            ? <BookmarkCheck className="w-3.5 h-3.5" />
                            : <Bookmark      className="w-3.5 h-3.5" />
                        }
                    </button>
                )}
                <button
                    onClick={onAddKeyword}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-sa-hover-strong hover:text-foreground transition-colors duration-100"
                    title="Add keyword"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={onInsert}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-sa-amber text-sa-on-amber hover:bg-sa-amber/90 transition-colors duration-100"
                    title="Insert info"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
        </div>
    );
}
