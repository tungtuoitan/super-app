/**
 * TaskLinkedKeywords — "Linked keywords" section of the task detail side column (#1514:
 * moved out of TaskDetailContent unchanged in logic, restyled as a quiet 28px list).
 */

import { Plus, X } from "lucide-react";
import { KeywordStaticIcon } from "@/shared";
import { useTaskDetailSelector } from "../../Selectors/TaskDetailSelector";
import { useTaskDetailKeywordSelector } from "../../Selectors/TaskDetailKeywordSelector";
import { useTaskDetailHelper } from "../../hooks/useTaskDetail.helper";
import { useTaskDetailStore } from "../../store/useTaskDetail.store";
import { SectionTitle } from "./SectionTitle";

export function TaskLinkedKeywords() {
    const { selectedTask, isDisabled } = useTaskDetailSelector();
    const { sortedLinkedKeywords } = useTaskDetailKeywordSelector();
    const { linkedKeywords, isLoadingLinkedKeywords } = useTaskDetailStore();
    const { handleOpenLinkPalette, handleNavigateKeyword, handleUnlinkKeyword } = useTaskDetailHelper();

    if (!selectedTask || selectedTask.id <= 0) return null;

    return (
        <div className="space-y-1">
            <SectionTitle title="Linked keywords" isLoading={isLoadingLinkedKeywords}>
                {!isDisabled && (
                    <button
                        onClick={handleOpenLinkPalette}
                        className="rounded-md p-1 text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground"
                        title="Link a keyword"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                )}
            </SectionTitle>
            {linkedKeywords.length > 0 ? (
                <div className="max-h-[200px] space-y-px overflow-y-auto">
                    {sortedLinkedKeywords.map((lk) => (
                        <div
                            key={lk.linkId}
                            className="group flex h-7 items-center gap-2 rounded-md px-1.5 text-[13px] transition-colors duration-100 hover:bg-sa-hover"
                        >
                            <KeywordStaticIcon type={lk.type} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span
                                className="flex-1 cursor-pointer truncate text-left hover:underline"
                                onClick={() => handleNavigateKeyword(lk as any)}
                                title={lk.longLink || lk.name}
                            >
                                {lk.name.length > 26 ? lk.name.slice(0, 26) + "..." : lk.name}
                            </span>
                            {!isDisabled && (
                                <button
                                    onClick={(e) => handleUnlinkKeyword(e, lk.linkId, lk.name)}
                                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity duration-100 hover:text-sa-danger group-hover:opacity-100"
                                    title="Unlink keyword"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                !isLoadingLinkedKeywords && <p className="px-1.5 text-xs text-muted-foreground">No linked keywords</p>
            )}
        </div>
    );
}
