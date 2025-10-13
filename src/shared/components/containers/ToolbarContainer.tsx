import { AppBar, SxProps, Theme, Toolbar, styled } from "@mui/material";

export const ToolbarWrapper = styled('div')({
    '& .MuiPaper-root': {
        marginTop: '1px',
        backgroundColor: '#fff',
        color: '#000',
    },
    flexGrow: 1,
    '& .isImportant-icon-false': {
        color: '#D8D8D7'
    },
    '& .isImportant-icon-true': {
        color: '#C70039'
    },
    '& .selected-true': {
        backgroundColor: '#D8D8D7'
    }
});

export interface IToolbarContainer {
    children: React.ReactNode;
}

/**
 * Toolbar container component matching portal's ToolbarContainer
 * Provides a consistent styled toolbar for grid layouts
 */
export const ToolbarContainer = ({ children }: { children: React.ReactNode, sxBoxToolbar?: SxProps<Theme> | undefined }) => {
    return (
        <ToolbarWrapper>
            <AppBar style={{ marginTop: '3px', backgroundColor: '#fff' }}
                position="static"
                elevation={2}
                variant="elevation" >
                <Toolbar style={{
                    backgroundColor: '#fff',
                    color: '#000', //#000
                    paddingLeft: '18px!important',
                    
                }}>
                    {children}
                </Toolbar>
            </AppBar>
        </ToolbarWrapper>
    );
};