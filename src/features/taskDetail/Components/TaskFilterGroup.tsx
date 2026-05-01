/**
 * TaskFilterPopup - Filter popup for task views (taskList, kanban, timeline)
 * Self-contained, always operates on "taskGrid" filters in userProfile
 */

import { Button, useGetStandardRegistry } from "@/shared";
import { Checkbox } from "@/shared";
import { Label } from "@/shared";

export function TaskFilterGroup({ group, pending, isChecked, toggle }: any) {
    const options = useGetStandardRegistry(group.standardRegistryType);
    const isEmpty = !(pending as any)[group.key]?.trim();
    const ORDER = {
        status: ["open", "in_progress", "background_progress", "paused", "completed", "on_hold", "cancelled", "failed"],
        priority: ["low", "medium", "high"],
    };

    return (
        <div key={group.key} className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">{group.label}</Label>
                {isEmpty && <span className="text-xs text-red-500 font-medium">Required</span>}
            </div>
            <div className="space-y-1.5">
                {options
                    .sort((a: any, b: any) => {
                        const order = ORDER[group.key as keyof typeof ORDER] || [];
                        return order.indexOf(a.code) - order.indexOf(b.code);
                    })

                    .map((option: any) => {
                        const checked = isChecked(group.key, option.code);
                        return (
                            <div key={option.code} className="flex items-center space-x-2">
                                <Checkbox id={`${group.key}-${option.code}`} checked={checked} onCheckedChange={() => toggle(group.key, option.code)} />
                                <label htmlFor={`${group.key}-${option.code}`} className={`text-sm font-normal cursor-pointer ${checked ? "text-foreground" : "text-gray-400"}`}>
                                    {option.description || option.code}
                                </label>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
