import { styled } from '@mui/material/styles';
import { InputBase } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useState, useRef } from "react";
import { useTagUI } from '../../../store/TagUIContext';

const Search = styled('div')({
    position: 'relative',
    marginTop: '12px',
    marginLeft: 0,
    width: '300px',
    '& .MuiSvgIcon-root': {
        marginTop: '-5px',
    }
});

const SearchIconRoot = styled('div')({
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
});

const InputBaseRoot = styled(InputBase)({
    // vertical padding + font size from searchIcon
    width: '100%',
    color: 'inherit',
    paddingLeft: 30
});

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
        <Search>
            <SearchIconRoot>
                <SearchIcon />
            </SearchIconRoot>
            <InputBaseRoot
                className={"search-input"}
                inputRef={searchInputRef}
                autoFocus={true}
                placeholder="Search tags..."
                value={searchText}
                inputProps={{ 'aria-label': 'search tags' }}
                onKeyUp={onKeyUpHandlerSearch}
                onChange={onChangeHandler}
            />
        </Search>
    );
};