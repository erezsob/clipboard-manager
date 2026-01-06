import { format } from "date-fns";
import { MAX_TEXT_DISPLAY_LENGTH } from "./constants";

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
 * Retries an async operation with exponential backoff
 * @param options - Retry configuration options
 * @param options.operation - Async function to retry
 * @param options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param options.baseDelay - Base delay in milliseconds (default: 1000)
 * @returns Promise that resolves with the operation result
 * @throws Error if all retries fail
 */
export async function retryOperation<T>(
	options: RetryOperationOptions<T>,
): Promise<T> {
	const { operation, maxRetries = 3, baseDelay = 1000 } = options;
	let lastError: Error | null = null;
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			if (attempt < maxRetries - 1) {
				const delay = baseDelay * 2 ** attempt;
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}
	throw lastError || new Error("Operation failed after retries");
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
