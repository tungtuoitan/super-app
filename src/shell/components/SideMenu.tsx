import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";

import { useNavigationStore } from "../../contexts/NavigationContext";
import { sitemaps } from "./AllIcon";
import { SideMenuItem } from "./SideMenuItem";

/**
 * Side navigation menu component.
 *
 * This component renders the application's side navigation menu with:
 * - Collapsible/expandable functionality
 * - Navigation items from sitemap configuration
 * - Toggle button with directional arrow icons
 * - Tooltip feedback for expand/collapse action
 * - Dynamic styling based on expansion state
 *
 * The menu can be toggled between expanded (showing labels) and collapsed
 * (showing only icons) states to optimize screen space usage.
 *
 * @returns The side navigation menu component
 */
export function SideMenu() {
    const { expanded, setExpanded } = useNavigationStore();

    /**
     * Handle the expansion toggle for the sidebar.
     * Toggles between expanded and collapsed states.
     */
    const handleToggleExpansion = () => {
        setExpanded(!expanded);
    };

    const menuWrapperClasses = `
        flex flex-col h-full bg-[#36454f] relative
        transition-all duration-[400ms]
        ${expanded ? "w-[200px]" : "w-12"}
    `
        .trim()
        .replace(/\s+/g, " ");

    const navigationListClasses = `
        flex-grow flex flex-col pt-2.5
    `
        .trim()
        .replace(/\s+/g, " ");

    const expanderClasses = `
        p-2.5 relative text-white
        flex justify-end items-center w-full
        mt-auto z-10 pointer-events-auto
    `
        .trim()
        .replace(/\s+/g, " ");

    const expanderArrowClasses = `
        flex items-center justify-center p-1
        rounded transition-colors duration-200
        hover:bg-white/10 cursor-pointer
    `
        .trim()
        .replace(/\s+/g, " ");

    return (
        <div className={menuWrapperClasses}>
            <div className={navigationListClasses}>
                {sitemaps.map((item) => (
                    <SideMenuItem key={item.code} item={item} expanded={expanded} />
                ))}
            </div>

            <div className={expanderClasses}>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={expanderArrowClasses} onClick={handleToggleExpansion}>
                                {expanded ? <ChevronsLeft className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            <p>{expanded ? "Show Less" : "Show More"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}
