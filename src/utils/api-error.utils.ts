/**
 * API Error Utilities
 * Handle API response errors and provide user-friendly messages
 */

/**
 * Parse API error from Response object or Error
 * @param error - Error object (could be Response or Error)
 * @returns User-friendly error message
 */
export async function parseApiError(error: any): Promise<string> {
    // Handle Response object (from fetch API)
    if (error instanceof Response) {
        const status = error.status;

        // Handle unauthorized (401) and forbidden (403)
        if (status === 401 || status === 403) {
            return "Unauthorized. Please login again.";
        }

        // Try to get error message from response
        try {
            const errorData = await error.json();
            return errorData.message || errorData.error || `HTTP ${status}: ${error.statusText}`;
        } catch {
            // If can't parse JSON, use status text
            return `HTTP ${status}: ${error.statusText}`;
        }
    }

    // Handle regular Error objects
    if (error instanceof Error) {
        return error.message;
    }

    // Handle string errors
    if (typeof error === "string") {
        return error;
    }

    // Fallback
    return "An unexpected error occurred";
}

/**
 * Check if error is unauthorized (401/403)
 * @param error - Error object
 * @returns True if unauthorized
 */
export function isUnauthorizedError(error: any): boolean {
    if (error instanceof Response) {
        return error.status === 401 || error.status === 403;
    }
    return false;
}
