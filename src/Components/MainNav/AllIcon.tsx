import {
    ArrowRight,
    Ban,
    Calendar,
    Code,
    FileText,
    Folder,
    HelpCircle,
    Home,
    Hourglass,
    BookOpen,
    Link,
    Cross,
    Library,
    Tag,
    LogIn,
    Navigation,
    ExternalLink,
    Play,
    PiggyBank,
    Cuboid,
    User,
    SkipForward,
    MessageSquare,
    Sparkles,
    Users,
    ThumbsDown,
    ThumbsUp,
    Heart,
    Armchair,
} from "lucide-react";

import { SAModule } from "./SAModule";

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
        backgroundColor: "#fff!important",
        zIndex: 10000000000,
        height: "54px",
    },
    appBar: {
        backgroundColor: "#fff!important",
        position: "sticky",
        height: "54px",
    },
    menuButton: {
        // marginRight: theme.spacing(2),
    },
    title: {
        color: "#000000!important",
    },
    subtitle: {
        color: "#000",
        fontSize: ".8em!important",
        fontStyle: "italic",
    },
    companyName: {
        flexGrow: 1,
        display: "flex",
        // flexDirection: 'rơ',
        justifyContent: "flex-start",
        maxWidth: "200px",
    },
    environment: {
        flexGrow: 1,
        display: "flex",
        height: "50px",
        verticalAlign: "middle",
        lineHeight: "10px",
    },
    logo: {
        height: "45px",
        width: "auto",
    },
};

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
 * Props interface for the getIcon function.
 */
type getIconProps = {
    /** Icon code identifier, null if no icon */
    code: string | null;
    /** Context type for icon rendering */
    type?: "sidebar" | "folder" | "custom";
    /** Additional props to pass to the icon component */
    props?: any;
};

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

    switch (_props.type) {
        case "sidebar":
            return (
                <div className="flex flex-row justify-center items-center relative">
                    {allIcons({ className: "text-white", size: 20 }).find((x) => x.code === _props.code)?.icon ?? null}
                </div>
            );
        default:
            return null;
    }
}

export const allIcons = (props: any) => [
    { code: "accounts", icon: <Users {...props} /> },
    { code: "conversation", icon: <MessageSquare {...props} /> },
    { code: "finance", icon: <PiggyBank {...props} /> },
    { code: "folder", icon: <Folder {...props} /> },
    { code: "gratefulList", icon: <Heart {...props} /> },
    { code: "health", icon: <Cross {...props} /> },
    { code: "home", icon: <Home {...props} /> },
    { code: "it", icon: <Code {...props} /> },
    { code: "playground", icon: <Armchair {...props} /> },
    { code: "practice", icon: <Navigation {...props} /> },
    { code: "principle", icon: <Ban {...props} /> },
    { code: "schedule", icon: <Calendar {...props} /> },
    { code: "self-discipline", icon: <User {...props} /> },
    { code: "link", icon: <Link {...props} /> },
    { code: "knowledge", icon: <BookOpen {...props} /> },
    { code: "notes", icon: <FileText {...props} /> },
    { code: "tags", icon: <Tag {...props} /> },

    { code: "open-in-new", icon: <ExternalLink {...props} /> },
    { code: "skip", icon: <SkipForward {...props} /> },
    { code: "pass", icon: <ThumbsUp {...props} /> },
    { code: "fail", icon: <ThumbsDown {...props} /> },
    { code: "unknown-icon", icon: <HelpCircle {...props} /> },
    { code: "come-in", icon: <ArrowRight {...props} /> },
    { code: "review", icon: <ThumbsUp {...props} /> },
    { code: "learn-today", icon: <Library {...props} /> },
    { code: "open-knowledge", icon: <Sparkles {...props} /> },
    { code: "all-knowledge", icon: <Cuboid {...props} /> },
    { code: "play-review", icon: <Play {...props} /> },
    { code: "inprogress-review-later", icon: <Hourglass {...props} /> },
    { code: "login", icon: <LogIn {...props} /> },
];

export type iconType =
    | "accounts"
    | "conversation"
    | "finance"
    | "folder"
    | "gratefulList"
    | "health"
    | "home"
    | "it"
    | "playground"
    | "practice"
    | "principle"
    | "schedule"
    | "self-discipline"
    | "link"
    | "knowledge"
    | "notes"
    | "tags"
    | "open-in-new"
    | "skip"
    | "pass"
    | "fail"
    | "unknown-icon";
