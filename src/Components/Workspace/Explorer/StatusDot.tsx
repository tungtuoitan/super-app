import React, { useState } from "react";

interface StatusDotProps {
    isUnsaved: boolean;
    isDuplicate: boolean;
    itemType: "Note" | "File" | "Folder";
    itemName: string;
    targetWorkspaceName?: string;
}

// TODO: TẠM THỜI DÙNG targetWorkspaceName ĐỂ HIỂN THỊ TOOLTIP CHO DUPLICATE, SAU NÀY TA SẼ LẤY LÊN TẤT CẢ WORKSPACE LINK ĐẾN ITEM NÀY
export function StatusDot({ isUnsaved, isDuplicate, itemType, itemName, targetWorkspaceName }: StatusDotProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    if (!isUnsaved && !isDuplicate) {
        return null;
    }

    const dotColor = isUnsaved ? "bg-green-900" : " dark:bg-yellow-900";
    
    // Build tooltip message
    let tooltipMessage = "";
    if (isUnsaved) {
        tooltipMessage = `New ${itemType}`;
    } else if (isDuplicate && targetWorkspaceName) {
        tooltipMessage = `This ${itemType.toLowerCase()} is existing in workspace "${targetWorkspaceName}" also`;
    }

    return (
        <div 
            className="relative flex items-center justify-center w-4 h-4 ml-auto mr-1 cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {/* Dot */}
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            
            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute bottom-full mb-2 right-0 z-50 pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs py-1.5 px-3 rounded whitespace-nowrap shadow-lg">
                        {tooltipMessage}
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full right-2 -mt-[1px]">
                        <div className="border-4 border-transparent border-t-gray-900" />
                    </div>
                </div>
            )}
        </div>
    );
}
