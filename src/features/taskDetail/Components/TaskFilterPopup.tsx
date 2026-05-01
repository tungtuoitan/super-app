/**
 * TaskFilterPopup - Filter popup for task views (taskList, kanban, timeline)
 * Self-contained, always operates on "taskGrid" filters in userProfile
 */

import React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { Button, useGetStandardRegistry } from "@/shared";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared";
import { Checkbox } from "@/shared";
import { Label } from "@/shared";
import { constants } from "@/shared";
import { filterUtils } from "@/shell";
import { userProfileService } from "@/shared";
import {parseApiError} from "@/shared";
import {UserFilters, ViewFilter} from "@/shell";
import {useAuthStore} from "@/shared";
import {TaskFilterGroup} from "./TaskFilterGroup";
// eslint-disable-next-line no-restricted-imports -- direct import to break project ↔ taskDetail circular dep
import {projectConstants} from "@/features/project/project.constants";

const DEFAULT_FILTERS = projectConstants.filters.defaults.taskGrid as ViewFilter;
const GROUPS = projectConstants.filters.taskGroups;

export function TaskFilterPopup() {
    const { $user, set$User } = useAuthStore();
    const [open, setOpen] = React.useState(false);
    const [pending, setPending] = React.useState<ViewFilter>(DEFAULT_FILTERS);

    const saved = $user.filters?.taskGrid || DEFAULT_FILTERS;

    const hasSavedDiff = saved.status !== DEFAULT_FILTERS.status || saved.priority !== DEFAULT_FILTERS.priority;
    const isPendingEmpty = !pending.status?.trim() || !pending.priority?.trim();

    const isChecked = (field: string, value: string) =>
        filterUtils._hasValue((pending as any)[field], value);

    const toggle = (field: string, value: string) => {
        setPending((prev) => ({
            ...prev,
            [field]: filterUtils._toggle((prev as any)[field], value),
        }));
    };

    const handleOpen = (newOpen: boolean) => {
        if (newOpen) {
            setPending(saved);
        }
        setOpen(newOpen);
    };

    const persist = async (filters: ViewFilter) => {
        const token = $user.userToken;
        const newUserFilters: UserFilters = { ...($user.filters || {}), taskGrid: filters };
        const result = await userProfileService._upsertUserProfile(token, {
            filters: JSON.stringify(newUserFilters),
        });
        if (!result.success) throw new Error(result.message || "Failed to save filters");
        const parsed = result.object?.filters ? JSON.parse(result.object.filters) : newUserFilters;
        set$User({ ...$user, filters: parsed });
    };

    const handleApply = async () => {
        try {
            await persist(pending);
            setOpen(false);
        } catch (err) {
            const msg = await parseApiError(err);
            console.error("TaskFilterPopup apply error:", msg);
        }
    };

    const handleReset = async () => {
        try {
            await persist(DEFAULT_FILTERS);
            setOpen(false);
        } catch (err) {
            const msg = await parseApiError(err);
            console.error("TaskFilterPopup reset error:", msg);
        }
    };

    return (
        <Popover open={open} onOpenChange={handleOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                    <Filter className="h-4 w-4" />
                    {hasSavedDiff && <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <h4 className="font-medium text-sm">Filter Tasks</h4>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                disabled={!hasSavedDiff}
                                className="h-7 text-xs disabled:opacity-40 opacity-80 hover:opacity-100 disabled:cursor-not-allowed"
                            >
                                <RotateCcw className="h-3 mr-[-2px]" />
                                Reset
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleApply}
                                disabled={isPendingEmpty}
                                className="h-6 px-2 text-xs bg-white/80 hover:bg-white pb-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Apply
                            </Button>
                        </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Filter Fields */}
                    <div className="space-y-4">
                        {GROUPS.map((group:any) => {
                            return <TaskFilterGroup group={group} pending={pending} isChecked={isChecked} toggle={toggle} />
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}


