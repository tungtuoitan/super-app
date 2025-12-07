import React from 'react';
import { Filter, CheckCircle2, Archive, X } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/Components/ui/popover';
import { Table } from '@tanstack/react-table';
import { Note } from '@/types/note.types';

interface NoteGridFilterPopupProps {
    table: Table<Note>;
    columnFilters: any[];
    onClearFilters: () => void;
}

export function NoteGridFilterPopup({ 
    table, 
    columnFilters,
    onClearFilters 
}: NoteGridFilterPopupProps) {
    const currentFilter = table.getColumn('deletedAt')?.getFilterValue();
    const hasFilters = columnFilters.length > 0;

    const filterOptions = [
        {
            value: 'all',
            label: 'All Notes',
            icon: Filter,
            color: 'text-muted-foreground',
            description: 'Show all notes',
        },
        {
            value: 'active',
            label: 'Active Only',
            icon: CheckCircle2,
            color: 'text-green-500',
            description: 'Not deleted',
        },
        {
            value: 'deleted',
            label: 'Deleted Only',
            icon: Archive,
            color: 'text-red-500',
            description: 'Deleted notes',
        },
    ];

    const handleFilterChange = (value: string) => {
        const deletedAtColumn = table.getColumn('deletedAt');
        
        if (value === 'active') {
            // Active = not deleted (deletedAt is null)
            deletedAtColumn?.setFilterValue('null');
        } else if (value === 'deleted') {
            // Deleted = has deletedAt value
            deletedAtColumn?.setFilterValue('notNull');
        } else {
            // 'all' = no filter (show everything)
            deletedAtColumn?.setFilterValue(undefined);
        }
    };

    const getCurrentFilterValue = () => {
        if (currentFilter === undefined) return 'all';
        return currentFilter === 'null' ? 'active' : 'deleted';
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 relative"
                >
                    <Filter className="h-4 w-4" />
                    {hasFilters && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <h4 className="font-medium text-sm">Filter Notes</h4>
                        </div>
                        {hasFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClearFilters}
                                className="h-7 px-2 text-xs"
                            >
                                <X className="h-3 w-3 mr-1" />
                                Clear
                            </Button>
                        )}
                    </div>

                    <div className="h-px bg-border" />

                    {/* Filter Options */}
                    <div className="space-y-1">
                        {filterOptions.map((option) => {
                            const Icon = option.icon;
                            const isSelected = getCurrentFilterValue() === option.value;
                            
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => handleFilterChange(option.value)}
                                    className={`
                                        w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm
                                        transition-colors
                                        ${isSelected 
                                            ? 'bg-primary/10 text-primary font-medium' 
                                            : 'hover:bg-muted text-foreground'
                                        }
                                    `}
                                >
                                    <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : option.color}`} />
                                    <span className="flex-1 text-left">{option.label}</span>
                                    {isSelected && (
                                        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                            Active
                                        </Badge>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="h-px bg-border" />

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Showing results</span>
                        <Badge variant="outline" className="gap-1">
                            <span className="font-medium text-foreground">
                                {table.getFilteredRowModel().rows.length}
                            </span>
                            <span>/</span>
                            <span>{table.getRowModel().rows.length}</span>
                        </Badge>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
