/**
 * Validation utility functions for form inputs and data validation.
 *
 * This module provides standardized validation functions for:
 * - Email format validation
 * - Required field validation
 * - Length constraints validation
 * - Type-safe validation with proper error handling
 */

/**
 * Validate email address format.
 *
 * Uses a standard email regex pattern to validate the format.
 * Note: This is a basic validation and may not catch all edge cases.
 *
 * @param email - The email string to validate
 * @returns True if email format is valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidEmail('user@example.com'); // true
 * isValidEmail('invalid-email'); // false
 * isValidEmail('user@'); // false
 * ```
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate that a field has a required value.
 *
 * Handles different types of values:
 * - Strings: Must not be empty after trimming whitespace
 * - Other types: Must not be null or undefined
 *
 * @param value - The value to validate
 * @returns True if value is present and valid, false otherwise
 *
 * @example
 * ```typescript
 * isRequired('hello'); // true
 * isRequired('   '); // false
 * isRequired(''); // false
 * isRequired(null); // false
 * isRequired(0); // true (0 is a valid value)
 * ```
 */
export function isRequired(value: any): boolean {
    if (typeof value === "string") {
        return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
}

/**
 * Validate minimum length constraint for string values.
 *
 * @param value - The string to validate
 * @param minLength - The minimum required length
 * @returns True if string meets minimum length, false otherwise
 *
 * @example
 * ```typescript
 * hasMinLength('password123', 8); // true
 * hasMinLength('abc', 8); // false
 * ```
 */
export function hasMinLength(value: string, minLength: number): boolean {
    return value.length >= minLength;
}

/**
 * Validate maximum length constraint for string values.
 *
 * @param value - The string to validate
 * @param maxLength - The maximum allowed length
 * @returns True if string is within maximum length, false otherwise
 *
 * @example
 * ```typescript
 * hasMaxLength('hello', 10); // true
 * hasMaxLength('this is a very long string', 10); // false
 * ```
 */
export function hasMaxLength(value: string, maxLength: number): boolean {
    return value.length <= maxLength;
}
