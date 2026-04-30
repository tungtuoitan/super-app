/**
 * Icon Types - Shared icon type definitions
 * Used across the application for folder icons, note icons, etc.
 */

export enum IconKey {
    BIN = "BIN",
    FOLDER = "FOLDER",
    TASK = "TASK",
    NOTE = "NOTE",
    FILE = "FILE",
    INFORMATION = "INFORMATION",
    IMAGE = "IMAGE",
    VIDEO = "VIDEO",
    AUDIO = "AUDIO",
    PDF = "PDF",
    USER = "USER",
    USERS = "USERS",
    CALENDAR = "CALENDAR",
    CLOCK = "CLOCK",
    WARNING = "WARNING",
    CHECK = "CHECK",
    STAR = "STAR",
    HEART = "HEART",
    TAG = "TAG",
    LINK = "LINK",

    PLAN = "PLAN",
    DETAIL = "DETAIL",
    IMPORTANT = "IMPORTANT",
    URGENT = "URGENT",

    // New icons
    DATABASE = "DATABASE",
    VAULT = "VAULT",
    WALLET = "WALLET",
    ARMCHAIR = "ARMCHAIR",
    ITEM = "ITEM",
    CONVERSATION = "CONVERSATION",
    ATTITUDE = "ATTITUDE",
    AWARD = "AWARD",
    TABLE = "TABLE",
    TIMELINE = "TIMELINE",
    LINE_CHART = "LINE_CHART",
    LIST = "LIST",
    TODO_LIST = "TODO_LIST",
    COMPANY = "COMPANY",
    FINANCE = "FINANCE",
    BIKE = "BIKE",
    BIRD = "BIRD",
    BOOK = "BOOK",
    SUBTASK = "SUBTASK",
    FEATURE = "FEATURE",
    BUG = "BUG",
    TECH = "TECH",
    SKILL = "SKILL",
    CODE = "CODE",
    HEALTH = "HEALTH",
    // CIRCLE_SMALL = "CIRCLE_SMALL",
    EXERCISE = "EXERCISE",
    REPEAT = "REPEAT",
    MISSION = "MISSION",
    EVENT = "EVENT",
    LESSON = "LESSON",
    LIBRARIES = "LIBRARIES",
    LOGIC = "LOGIC",
    EXPERIENCE = "EXPERIENCE",
    RULE = "RULE",
    CHECKLIST = "CHECKLIST",
    HISTORY = "HISTORY",
    RELATIONSHIP = "RELATIONSHIP",
    IDEA = "IDEA",
    MEASUREMENT = "MEASUREMENT",
    ADJUSTMENT = "ADJUSTMENT",

    // Development & Technical icons
    PROCEDURE = "PROCEDURE",
    UI = "UI",
    SERVICE = "SERVICE",
    SERVER = "SERVER",
    BACKEND = "BACKEND",
    FRONTEND = "FRONTEND",
    FUNCTION = "FUNCTION",
    DIAGRAM = "DIAGRAM",
    FLOW = "FLOW",
    STEP = "STEP",
}



/**
 * Icon Types
 */

/**
 * Available icon types for the application
 * Used to identify different icon categories in the icon system
 */
/** Legacy category identifiers — use `IconKey` (enum) for the icon system */
export type IconCategory = "accounts" | "conversation" | "finance" | "folder" | "gratefulList" | "home" | "link" | "library" | "notes" | "sidebar";

/**
 * Props for icon components
 * Generic icon configuration with type and additional props
 */
export interface IconProps {
    code: string;
    type?: IconCategory;
    props?: any;
}
