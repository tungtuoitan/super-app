import { Search as SearchIcon } from 'lucide-react';
import { useState, useRef } from "react";
import { Input } from '@/Components/ui/input';

/**
 * Note Search toolbar component
 * Matches the exact UI pattern from ITRequestSearch
 */
export const NoteSearch = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const handleSearch = () => {
        if (searchTerm.trim()) {
            setSearchLoading(true);
            console.log('Searching for:', searchTerm);

            // Simulate search delay
            setTimeout(() => {
                setSearchLoading(false);
            }, 1000);
        }
    };

    const onKeyUpHandlerSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
        const target = event.target as HTMLInputElement;
        setSearchTerm(target.value);

        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="relative mt-3 w-[300px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                <SearchIcon className="w-4 h-4 text-muted-foreground" />
            </div>
            <Input
                ref={searchInputRef}
                autoFocus={true}
                placeholder="Search…"
                aria-label="search"
                className="pl-10"
                onKeyUp={onKeyUpHandlerSearch}
            />
        </div>
    );
};