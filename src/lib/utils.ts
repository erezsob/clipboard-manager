import { format } from "date-fns";
import { waitForCondition } from "../utils";
import { MAX_TEXT_DISPLAY_LENGTH } from "./constants";
import {
	type DbError,
	dbNotReady,
	maxRetriesExceeded,
	type WaitError,
} from "./errors";
import { err, ok, type Result } from "./fp";

/**
 * Formats a date string for display with relative time for recent dates
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Just now", "5m ago", "2h ago", "Jan 3, 2024")
 */
export function formatDate(dateString: string): string {
	try {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
		return format(date, "MMM d, yyyy");
	} catch {
		return dateString;
	}
}

/**
 * Truncates text to a maximum length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation (default: MAX_TEXT_DISPLAY_LENGTH)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(
	text: string,
	maxLength: number = MAX_TEXT_DISPLAY_LENGTH,
): string {
	if (text.length <= maxLength) return text;
	return `${text.substring(0, maxLength)}...`;
}

export interface RetryOperationOptions<T> {
	operation: () => Promise<T>;
	maxRetries?: number;
	baseDelay?: number;
}

/**
 * Retries an async operation with exponential backoff using recursion.
 * Returns a Result type for explicit error handling.
 *
 * @param options - Retry configuration options
 * @param options.operation - Async function to retry
 * @param options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param options.baseDelay - Base delay in milliseconds (default: 1000)
 * @returns Promise<Result<T, WaitError>> - Success with value or failure with error details
 *
 * @example
 * const result = await retryWithBackoff({
 *   operation: () => fetch('/api/data'),
 *   maxRetries: 3,
 *   baseDelay: 1000,
 * });
 *
 * if (result.ok) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.error.message);
 * }
 */
export async function retryWithBackoff<T>(
	options: RetryOperationOptions<T>,
): Promise<Result<T, WaitError>> {
	const { operation, maxRetries = 3, baseDelay = 1000 } = options;

	const attempt = async (
		currentAttempt: number,
		lastError: unknown,
	): Promise<Result<T, WaitError>> => {
		// Base case: exceeded max retries
		if (currentAttempt >= maxRetries) {
			return err(maxRetriesExceeded(currentAttempt, lastError));
		}

		try {
			const result = await operation();
			return ok(result);
		} catch (error) {
			// Wait before next attempt (exponential backoff)
			if (currentAttempt < maxRetries - 1) {
				const delay = baseDelay * 2 ** currentAttempt;
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
			// Recursive call with incremented attempt
			return attempt(currentAttempt + 1, error);
		}
	};

	return attempt(0, null);
}

/**
 * Determines if there are more items to load based on the number of results
 * @param resultsCount - Number of items returned in the current batch
 * @param batchSize - Expected batch size
 * @returns true if there are likely more items to load
 */
export function hasMoreItems(resultsCount: number, batchSize: number): boolean {
	return resultsCount === batchSize;
}

/**
 * Waits for the Electron API to be available.
 * Returns a Result indicating success or DB_NOT_READY if unavailable after timeout.
 */
export async function waitForElectronAPIResult(): Promise<
	Result<void, DbError>
> {
	const result = await waitForCondition({
		condition: () =>
			typeof window !== "undefined" && window.electronAPI !== undefined,
	});

	if (result.ok) {
		return ok(undefined);
	}
	return err(dbNotReady("Electron API not available after timeout"));
}
