import { Link } from "react-router-dom";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

import { useNavigationStore } from "../../contexts/NavigationContext";
import { getIcon } from "./AllIcon";
import { SAModule } from "./SAModule";

/**
 * Props interface for the SideMenuItem component.
 */
export interface ISideMenuProps {
    /** Navigation module item to display */
    item: SAModule;
    /** Whether the sidebar is in expanded state */
    expanded?: boolean;
}

/**
 * Side navigation menu item component.
 *
 * This component renders a single navigation item in the sidebar with:
 * - Icon representation of the module
 * - Text label (visible when expanded)
 * - Selection state management
 * - Tooltip for collapsed state
 * - Click handling for navigation
 *
 * The component adapts its appearance based on the sidebar expansion state
 * and highlights the currently selected item.
 *
 * @param props - Component props containing item and expansion state
 * @returns A navigation menu item component
 */
export function SideMenuItem(props: ISideMenuProps) {
    const { selectedItemId, setSelectedItemId } = useNavigationStore();

    /**
     * Handle menu item click.
     * Updates the selected item in the navigation context.
     */
    const handleClick = () => {
        setSelectedItemId(props.item.id);
    };

    const isSelected = selectedItemId === props.item.id;

    const linkClasses = `
        flex w-full flex-row items-center relative flex-grow
        py-0.5 px-2.5 min-h-9
        text-white no-underline rounded
        transition-colors duration-200
        hover:bg-black/30
        active:bg-black/30
        ${isSelected ? "bg-black/30" : ""}
    `
        .trim()
        .replace(/\s+/g, " ");

    const wrapperClasses = `
        flex-shrink-0 flex flex-col relative items-start w-full
    `
        .trim()
        .replace(/\s+/g, " ");

    const iconWrapperClasses = `
        min-w-6 w-6 h-6 text-white
        flex flex-row items-center justify-center
    `
        .trim()
        .replace(/\s+/g, " ");

    const labelClasses = `
        text-white text-[0.95rem] flex-grow
        flex flex-row items-center pl-3
        font-normal no-underline
        whitespace-nowrap overflow-hidden text-ellipsis
    `
        .trim()
        .replace(/\s+/g, " ");

    const menuItemContent = (
        <Link id={props.item.id} className={linkClasses} to={props.item.link} onClick={handleClick}>
            <div className={iconWrapperClasses}>{getIcon({ code: props.item.code, type: "sidebar" })}</div>
            <span className={labelClasses}>{props.item.name}</span>
        </Link>
    );

    return (
        <div className={wrapperClasses}>
            {props.expanded ? (
                menuItemContent
            ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>{menuItemContent}</TooltipTrigger>
                        <TooltipContent side="right">
                            <p>{props.item.name}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );
}
