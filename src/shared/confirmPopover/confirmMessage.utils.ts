/**
 * Generic Confirmation Message Utility
 * Basic confirmation messages for common delete scenarios
 * For entity-specific messages, use feature-specific utilities instead
 */

import { type ConfirmMessage, type DeleteType } from "./types";

export interface GenericConfirmMessageParams {
    type: DeleteType;
    entityType: string;
    count: number;
    isMultiple: boolean;
}

/**
 * Generate a basic confirmation message
 * Returns a generic message without entity-specific details
 * For more detailed messages with entity names, use feature-specific utilities
 */
export const getGenericConfirmMessage = (params: GenericConfirmMessageParams): ConfirmMessage => {
    const { type, entityType, count, isMultiple } = params;

    if (type === "soft-delete") {
        const plural = isMultiple ? `${count} ${entityType}s` : `this ${entityType}`;
        return {
            title: isMultiple ? `Delete ${count} ${entityType}s?` : `Delete this ${entityType}?`,
            subtitle: `Are you sure you want to delete ${plural}?`
        };
    } else {
        const plural = isMultiple ? `${count} ${entityType}s` : `this ${entityType}`;
        return {
            title: isMultiple ? `⚠️ Permanently delete ${count} ${entityType}s?` : `⚠️ Permanently delete this ${entityType}?`,
            subtitle: `This action CANNOT be undone. ${plural.charAt(0).toUpperCase() + plural.slice(1)} will be LOST FOREVER.`
        };
    }
};
