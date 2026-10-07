/**
 * TaskOptionPicker — icon-only status/priority control for the Linear-style task list (#1514).
 * Click the icon → popover with searchable options → onUpdate (same handler as the old StatusCell/PriorityCell).
 */

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger, Command, CommandInput, CommandItem, CommandGroup, CommandEmpty, TaskStatusIcon, TaskPriorityIcon } from "@/shared";
import type { IStatusOption } from "@/shared";
import type { Task } from "@/features/taskDetail";

interface TaskOptionPickerProps {
    task: Task;
    field: "status" | "priority";
    options: IStatusOption[];
    onUpdate: (task: Task, field: "status" | "priority", value: string) => void;
}

export function TaskOptionPicker({ task, field, options, onUpdate }: TaskOptionPickerProps) {
    const [open, setOpen] = useState(false);
    const current = field === "status" ? task.status : task.priority;
    const currentLabel = options.find((o) => o.code === current)?.label ?? current ?? "—";
    const renderIcon = (code: string | null | undefined, label?: string) =>
        field === "status" ? <TaskStatusIcon status={code} title={label} /> : <TaskPriorityIcon priority={code} title={label} className="text-muted-foreground" />;

    return (
        // stopPropagation: popover content is portalled but React events still bubble to the row (openTaskTab)
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        disabled={!!task.deletedAt}
                        aria-label={`${field}: ${currentLabel}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-100 hover:bg-sa-hover-strong disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {renderIcon(current, currentLabel)}
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-[190px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder={`Change ${field}…`} />
                        <CommandEmpty>No {field} found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.code}
                                    value={`${option.code}-${option.label}`}
                                    onSelect={() => {
                                        setOpen(false);
                                        if (option.code !== current) onUpdate(task, field, option.code);
                                    }}
                                >
                                    {renderIcon(option.code, option.label)}
                                    <span className="flex-1 truncate">{option.label}</span>
                                    <Check className={cn("h-3.5 w-3.5", option.code === current ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
