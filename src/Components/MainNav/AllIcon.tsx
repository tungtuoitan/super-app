
import { styled } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BlockIcon from '@mui/icons-material/Block';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CodeIcon from '@mui/icons-material/Code';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FolderIcon from '@mui/icons-material/Folder';
import HelpIcon from '@mui/icons-material/Help';
import HomeIcon from '@mui/icons-material/Home';
import HourglassFullIcon from '@mui/icons-material/HourglassFull';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import LinkIcon from '@mui/icons-material/Link';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import LoginIcon from '@mui/icons-material/Login';
import NearMeIcon from '@mui/icons-material/NearMe';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SavingsIcon from '@mui/icons-material/Savings';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SmsIcon from '@mui/icons-material/Sms';
import SpaIcon from '@mui/icons-material/Spa';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt';
import ThumbsUpDownIcon from '@mui/icons-material/ThumbsUpDown';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import WeekendIcon from '@mui/icons-material/Weekend';

import { SAModule } from './SAModule';

/**
 * Application icon management and navigation configuration.
 * 
 * This module provides:
 * - Icon mappings for navigation items
 * - Style classes for navigation components
 * - Site map configuration with navigation modules
 * - Icon rendering utilities for different contexts
 * 
 * The module centralizes all icon-related functionality and provides
 * a consistent interface for displaying icons throughout the application.
 */

/**
 * Common style classes used across navigation components.
 * These styles are shared between various navigation elements.
 */
export const classes = {
    grow: {
        flexGrow: 1,
    },
    root: {
        flexGrow: 1,
        backgroundColor: '#fff!important',
        zIndex: 10000000000,
        height: '54px'
    },
      appBar: {
        backgroundColor: '#fff!important',
        position: 'sticky',
        height: '54px',
      },
      menuButton: {
        // marginRight: theme.spacing(2),
      },
      title: {
        color: '#000000!important',
        
      },
      subtitle: {
        color: '#000',
        fontSize:'.8em!important',
        fontStyle: "italic"
      },
      companyName: {
        flexGrow: 1,
        display: 'flex',
        // flexDirection: 'rơ',
        justifyContent: 'flex-start',
        maxWidth: '200px',
      },
      environment: {
        flexGrow: 1,
        display: 'flex',
        height: '50px',
        verticalAlign: 'middle',
        lineHeight: '10px',
      },
      logo: {
        height:'45px',
        width:'auto'
      },
}

let sitemapId = 1;
export const sitemaps = [
    // {
    //     id: (sitemapId++).toString(),
    //     name: "Schedule",
    //     code: "schedule",
    //     link: "/schedule",
    // } as SAModule,

    // {
    //     id: (sitemapId++).toString(),
    //     name: "Practice",
    //     code: "practice",
    //     link: '/practice',
    //     open: true,
    // } as SAModule,
    {
        id: (sitemapId++).toString(),
        name: "Tags",
        code: "tags",
        link: "/tags",
    } as SAModule,
    {
        id: (sitemapId++).toString(),
        name: "Notes",
        code: "notes",
        link: "/notes",
    } as SAModule,
    // {
    //     id: (sitemapId++).toString(),
    //     name: "Login",
    //     code: "login",
    //     link: "/login",
    // } as SAModule,



    // -------
    // {
    //     id: (sitemapId++).toString(),
    //     name: "Playground",
    //     code: "playground",
    //     link: FinkToProtocol(
    //         "https://www.figma.com/board/DiwrOCIBu6hmWp1i2C6jtJ/every-things?node-id=6791-6988&t=BFpnlwVd1qwEyGqt-11"
    //     ),
    //     open: false,
    //     active: false,
    // } as SAModule,
    // {
    //     id: (sitemapId++).toString(),
    //     name: "Accounts",
    //     code: "accounts",
    //     link: FinkToProtocol(
    //         "https://www.figma.com/board/DiwrOCIBu6hmWp1i2C6jtJ/every-things?node-id=6801-7204&t=BFpnlwVd1qwEyGqt-11"
    //     ),
    //     open: true,
    // } as SAModule,
    // {
    //     id: (sitemapId++).toString(),
    //     name: "Finance",
    //     code: "finance",
    //     link: FinkToProtocol(
    //         "https://www.figma.com/board/DiwrOCIBu6hmWp1i2C6jtJ/every-things?node-id=6858-6967&t=uJB31J2oksQK9Vcg-11"
    //     ),
    //     open: true,
    // } as SAModule,
    // {
    //     id: (sitemapId++).toString(),
    //     name: "Self Discipline",
    //     code: "self-discipline",
    //     link: FinkToProtocol('https://www.figma.com/board/DiwrOCIBu6hmWp1i2C6jtJ/every-things?node-id=7187-7468&t=VVeIDUNTdR22vWNC-11'),
    //     open: true,
    // } as SAModule,
    // {
    //     id: (sitemapId++).toString(),
    //     name: "Health",
    //     code: "health",
    //     link: FinkToProtocol('https://www.figma.com/board/DiwrOCIBu6hmWp1i2C6jtJ/every-things?node-id=7228-7274&t=9qoy0iKBEDHQbRwU-11'),
    //     open: true,
    // } as SAModule,
    // {
    //     id: (sitemapId++).toString(),
    //     name: "Principle",
    //     code: "principle",
    //     link: FinkToProtocol('https://www.figma.com/board/DiwrOCIBu6hmWp1i2C6jtJ/every-things?node-id=7440-2179&t=j7iqDVsFAFmAsQEH-11'),
    //     open: true,
    // } as SAModule,
    // {
    //     id: (sitemapId++).toString(),
    //     name: "Grateful List",
    //     code: "gratefulList",
    //     link: FinkToProtocol('https://www.figma.com/board/DiwrOCIBu6hmWp1i2C6jtJ/every-things?node-id=7441-2184&t=j7iqDVsFAFmAsQEH-11'),
    //     open: true,
    // } as SAModule,
    // {
    //     id: (sitemapId++).toString(),
    //     name: "Conversation",
    //     code: "conversation",
    //     link: FinkToProtocol('https://www.figma.com/board/DiwrOCIBu6hmWp1i2C6jtJ/every-things?node-id=7709-2269&t=r761hHDBBzTxPykI-11'),
    //     open: true,
    // } as SAModule,
    // {
    //     id: (sitemapId++).toString(),
    //     name: "IT",
    //     code: "it",
    //     link: FinkToProtocol('https://www.figma.com/board/DiwrOCIBu6hmWp1i2C6jtJ/every-things?node-id=7709-2629&t=r761hHDBBzTxPykI-11'),
    //     open: true,
    // } as SAModule,
] as SAModule[];

/**
 * Styled wrapper component for icons.
 * Provides consistent centering and alignment for icon display.
 */
const Wicon = styled('div')({
    display: 'flex', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'relative', 
});

/**
 * Props interface for the getIcon function.
 */
type getIconProps = {
    /** Icon code identifier, null if no icon */
    code: string | null;
    /** Context type for icon rendering */
    type?: 'sidebar' | 'folder' | 'custom';
    /** Additional props to pass to the icon component */
    props?: any;
}

/**
 * Get an icon component based on code and type.
 * 
 * This function retrieves the appropriate icon component for display
 * in different contexts (sidebar, folder, custom) with consistent styling.
 * 
 * @param _props - Icon properties including code, type, and additional props
 * @returns Styled icon component or null if not found
 */
export function getIcon(_props: getIconProps) {
    if (!_props.code) return null;

    switch(_props.type){
        case 'sidebar': 
            return <Wicon>{
                allIcons({sx: { fontSize:20, color: 'white' }})
                .find(x => x.code === _props.code)?.icon ?? null}
            </Wicon>
        default:
            return null;
    }
}

export const allIcons = (props: any) => [
    { code: 'accounts', icon: <SwitchAccountIcon {...props} /> },
    { code: 'conversation', icon: <SmsIcon {...props} /> },
    { code: 'finance', icon: <SavingsIcon {...props} /> },
    { code: 'folder', icon: <FolderIcon {...props} /> },
    { code: 'gratefulList', icon: <VolunteerActivismIcon {...props} /> },
    { code: 'health', icon: <LocalHospitalIcon {...props} /> },
    { code: 'home', icon: <HomeIcon {...props} /> },
    { code: 'it', icon: <CodeIcon {...props} /> },
    { code: 'playground', icon: <WeekendIcon {...props} /> },
    { code: 'practice', icon: <NearMeIcon {...props} /> },
    { code: 'principle', icon: <BlockIcon {...props} /> },
    { code: 'schedule', icon: <CalendarMonthIcon {...props} /> },
    { code: 'self-discipline', icon: <SelfImprovementIcon {...props} /> },
    { code: 'link', icon: <LinkIcon {...props} /> },
    { code: 'knowledge', icon: <LibraryBooksIcon {...props} /> },
    { code: 'notes', icon: <EditNoteIcon {...props} /> },
    { code: 'tags', icon: <LocalOfferIcon {...props} /> },

    { code: 'open-in-new', icon: <OpenInNewIcon {...props} /> },
    { code: 'skip', icon: <SkipNextIcon {...props} /> },
    { code: 'pass', icon: <ThumbUpAltIcon {...props} /> },
    { code: 'fail', icon: <ThumbDownAltIcon {...props} /> },
    { code: 'unknown-icon', icon: <HelpIcon {...props} /> },
    { code: 'come-in', icon: <ArrowForwardIcon {...props} /> },
    { code: 'review', icon: <ThumbsUpDownIcon {...props} /> },
    { code: 'learn-today', icon: <LocalLibraryIcon {...props} /> },
    { code: 'open-knowledge', icon: <SpaIcon {...props} /> },
    { code: 'all-knowledge', icon: <SelectAllIcon {...props} /> },
    { code: 'play-review', icon: <PlayArrowIcon {...props} /> },
    { code: 'inprogress-review-later', icon: <HourglassFullIcon {...props} /> },
    { code: 'login', icon: <LoginIcon {...props} /> },

];

export type iconType = 'accounts' | 'conversation' | 'finance' | 'folder' | 'gratefulList' | 
'health' | 'home' | 'it' | 'playground' | 'practice' | 'principle' | 'schedule' | 'self-discipline' | 'link' | 'knowledge' | 'notes' | 'tags' | 'open-in-new' | 'skip' | 'pass' | 'fail' | 'unknown-icon';
