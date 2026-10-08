/**
 * TabOverflowMenu — "…" button at the end of the single-line tab bar (#1514).
 * Lists every open tab (tabs scrolled out of view included); picking one activates it.
 */

import React, { useState } from "react";
import { MoreHorizontal, FileText, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger, Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/shared";
import { moduleRegistry } from "../../moduleRegistry";
import type { BaseTab } from "../../types/tab.types";

interface TabOverflowMenuProps {
    tabs: BaseTab[];
    activeTabId: string | null;
    onSelect: (tabId: string) => void;
}

export function TabOverflowMenu({ tabs, activeTabId, onSelect }: TabOverflowMenuProps) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label="All open tabs"
                    title="All open tabs"
                    className="mx-1 my-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-100 hover:bg-sa-hover-strong hover:text-foreground"
                >
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="end">
                <Command>
                    <CommandInput placeholder="Find tab…" />
                    <CommandList className="max-h-[360px]">
                        <CommandEmpty>No tab found.</CommandEmpty>
                        <CommandGroup heading={`${tabs.length} open`}>
                            {tabs.map((tab) => {
                                const meta = moduleRegistry.getTabMeta(tab);
                                const icon = meta
                                    ? React.cloneElement(meta.icon as React.ReactElement, { className: "h-3.5 w-3.5", style: { color: meta.color } })
                                    : <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
                                return (
                                    <CommandItem
                                        key={tab.id}
                                        value={`${tab.title} ${tab.id}`}
                                        onSelect={() => {
                                            setOpen(false);
                                            onSelect(tab.id);
                                        }}
                                        className={cn(tab.id === activeTabId && "text-foreground")}
                                    >
                                        {icon}
                                        <span className="flex-1 truncate">{tab.title}</span>
                                        {tab.isPinned && <Pin className="h-3 w-3 rotate-45 text-muted-foreground" />}
                                        {tab.hasUnsavedChanges && <span className="h-1.5 w-1.5 rounded-full bg-foreground" />}
                                        {tab.id === activeTabId && <span className="h-1.5 w-1.5 rounded-full bg-sa-amber" />}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
