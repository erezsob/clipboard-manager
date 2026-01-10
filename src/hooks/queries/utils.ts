import {
	type ClipboardError,
	clipboardApiNotAvailable,
	clipboardWriteFailed,
	getErrorMessage,
} from "../../lib/errors";
import { err, none, type Option, ok, type Result, some } from "../../lib/fp";
import { retryWithBackoff } from "../../lib/utils";
import type { InfiniteHistoryData } from "./types";

/**
 * Detects if clipboard content has changed from previous value.
 * Pure function - no side effects.
 *
 * @param current - Current clipboard text (may be empty string)
 * @param previous - Previous clipboard text
 * @returns Option containing the new text if changed, none otherwise
 *
 * @example
 * detectClipboardChange("hello", "")      // some("hello")
 * detectClipboardChange("hello", "hello") // none
 * detectClipboardChange("", "hello")      // none (empty is not a change)
 */
export const detectClipboardChange = (
	current: string,
	previous: string,
): Option<string> => (current && current !== previous ? some(current) : none);

/**
 * Normalizes clipboard text for comparison.
 * Pure function - handles null/undefined gracefully.
 *
 * @param text - Raw text from clipboard (may be null/undefined)
 * @returns Normalized string (empty string if input is falsy)
 */
export const normalizeClipboardText = (
	text: string | null | undefined,
): string => text || "";

/**
 * Calculates the new selected index after an item is deleted.
 * Pure function - no side effects.
 *
 * @param currentIndex - Current selected index
 * @param listLength - Current length of the list
 * @returns New index that is valid for the list after deletion
 */
export const calculateIndexAfterDelete = (
	currentIndex: number,
	listLength: number,
): number => {
	// If current index is at or past the end after deletion, move to last valid index
	if (currentIndex >= listLength - 1) {
		return Math.max(0, listLength - 2);
	}
	return currentIndex;
};

/**
 * Formats an action error with context.
 * Pure function - no side effects.
 *
 * @param defaultMessage - Base error message
 * @param error - The error that occurred
 * @returns Formatted error message string
 */
export const formatActionError = (
	defaultMessage: string,
	error: unknown,
): string => {
	const message = getErrorMessage(error);
	return `${defaultMessage}: ${message}`;
};

/**
 * Writes text to clipboard with retry logic.
 * Returns a Result for explicit error handling.
 */
export async function writeToClipboardWithRetry(
	text: string,
): Promise<Result<void, ClipboardError>> {
	if (!window.electronAPI) {
		return err(clipboardApiNotAvailable());
	}

	const result = await retryWithBackoff({
		operation: async () => {
			await window.electronAPI.clipboard.writeText(text);
		},
	});

	if (result.ok) {
		return ok(undefined);
	}
	// Extract lastError if available (only on MAX_RETRIES_EXCEEDED type)
	const lastError =
		result.error.type === "MAX_RETRIES_EXCEEDED"
			? result.error.lastError
			: undefined;
	return err(clipboardWriteFailed(result.error.message, lastError));
}

/**
 * Creates a transformer that removes an item from all pages by ID.
 * Pure function - no side effects, returns new data structure.
 *
 * @param itemId - The ID of the item to remove
 * @returns A function that transforms InfiniteHistoryData by removing the item
 */
export const removeItemFromPages =
	(itemId: number) =>
	(data: InfiniteHistoryData): InfiniteHistoryData => ({
		...data,
		pages: data.pages.map((page) => ({
			...page,
			items: page.items.filter((item) => item.id !== itemId),
		})),
	});

/**
 * Creates a transformer that toggles the favorite status of an item by ID.
 * Pure function - no side effects, returns new data structure.
 *
 * @param itemId - The ID of the item to toggle
 * @returns A function that transforms InfiniteHistoryData by toggling the item's favorite status
 */
export const toggleItemFavorite =
	(itemId: number) =>
	(data: InfiniteHistoryData): InfiniteHistoryData => ({
		...data,
		pages: data.pages.map((page) => ({
			...page,
			items: page.items.map((item) =>
				item.id === itemId
					? { ...item, is_favorite: item.is_favorite === 1 ? 0 : 1 }
					: item,
			),
		})),
	});

/**
 * Creates empty history data structure.
 * Pure function - no side effects.
 *
 * @param data - The existing data to preserve pageParams from
 * @returns New InfiniteHistoryData with empty items
 */
export const clearAllPages = (
	data: InfiniteHistoryData,
): InfiniteHistoryData => ({
	...data,
	pages: [{ items: [], nextOffset: undefined }],
	pageParams: [0],
});

/**
 * Applies a transformation to InfiniteHistoryData if it exists.
 * Helper for use with queryClient.setQueriesData.
 *
 * @param transform - The transformation function to apply
 * @returns A function that safely applies the transform or returns undefined
 */
export const applyTransform =
	(transform: (data: InfiniteHistoryData) => InfiniteHistoryData) =>
	(old: InfiniteHistoryData | undefined): InfiniteHistoryData | undefined =>
		old ? transform(old) : old;
