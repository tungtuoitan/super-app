import { Input } from '@/Components/ui/input';
import { Search } from 'lucide-react';
import { useState, useRef } from "react";
import { useTagUI } from '../../../store/TagUIContext';
import { cn } from '@/lib/utils';

/**
 * Tag Search toolbar component
 * Provides search functionality for tag filtering
 */
export const TagSearch = () => {
    const { searchText, setSearchText } = useTagUI();
    const [searchLoading, setSearchLoading] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const handleSearch = () => {
        if (searchText.trim()) {
            setSearchLoading(true);
            console.log('Searching for tags:', searchText);

            // Simulate search delay
            setTimeout(() => {
                setSearchLoading(false);
            }, 500);
        }
    };

    const onKeyUpHandlerSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
        const target = event.target as HTMLInputElement;
        setSearchText(target.value);

        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(event.target.value);
    };

    return (
        <div className="relative mt-3 w-[300px]">
            <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
                ref={searchInputRef}
                autoFocus
                placeholder="Search tags..."
                value={searchText}
                className={cn("pl-8", searchLoading && "opacity-50")}
                aria-label="search tags"
                onKeyUp={onKeyUpHandlerSearch}
                onChange={onChangeHandler}
            />
        </div>
    );
};