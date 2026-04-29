
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
