import { type DbError, queryFailed } from "./errors";
import { type Result, tryCatchAsync } from "./fp";
import { waitForElectronAPI, waitForElectronAPIResult } from "./utils";

export interface HistoryItem {
	id: number;
	content: string;
	type: string;
	created_at: string;
	is_favorite: number;
}

export interface GetHistoryOptions {
	query?: string;
	limit?: number;
	favoritesOnly?: boolean;
	offset?: number;
}

/**
 * Get history items with pagination support.
 * Returns a Result for explicit error handling.
 */
export async function getHistoryResult(
	options: GetHistoryOptions = {},
): Promise<Result<HistoryItem[], DbError>> {
	const { query, limit = 50, favoritesOnly = false, offset = 0 } = options;

	const apiResult = await waitForElectronAPIResult();
	if (!apiResult.ok) return apiResult;

	return tryCatchAsync(
		() => window.electronAPI.db.getHistory(query, limit, favoritesOnly, offset),
		(error) => queryFailed("Failed to get history", error),
	);
}

/**
 * Delete a history item by ID.
 * Returns a Result for explicit error handling.
 */
export async function deleteHistoryItemResult(
	id: number,
): Promise<Result<void, DbError>> {
	const apiResult = await waitForElectronAPIResult();
	if (!apiResult.ok) return apiResult;

	return tryCatchAsync(
		async () => {
			window.electronAPI.db.deleteHistoryItem(id);
		},
		(error) => queryFailed("Failed to delete history item", error),
	);
}

/**
 * Clear all history.
 * Returns a Result for explicit error handling.
 */
export async function clearAllHistoryResult(): Promise<Result<void, DbError>> {
	const apiResult = await waitForElectronAPIResult();
	if (!apiResult.ok) return apiResult;

	return tryCatchAsync(
		async () => {
			window.electronAPI.db.clearAllHistory();
		},
		(error) => queryFailed("Failed to clear all history", error),
	);
}

/**
 * Toggle favorite status of a history item.
 * Returns a Result containing the new favorite state.
 */
export async function toggleFavoriteResult(
	id: number,
): Promise<Result<boolean, DbError>> {
	const apiResult = await waitForElectronAPIResult();
	if (!apiResult.ok) return apiResult;

	return tryCatchAsync(
		() => window.electronAPI.db.toggleFavorite(id),
		(error) => queryFailed("Failed to toggle favorite", error),
	);
}

// ============================================================================
// Legacy API (deprecated, kept for backward compatibility)
// ============================================================================

/**
 * @deprecated Use addClipResult for explicit error handling
 * Add a clipboard entry if it's different from the most recent entry
 */
export async function addClip(text: string): Promise<void> {
	await waitForElectronAPI();
	await window.electronAPI.db.addClip(text);
}

/**
 * @deprecated Use getHistoryResult for explicit error handling
 * Get history items with pagination support
 */
export async function getHistory(
	options: GetHistoryOptions = {},
): Promise<HistoryItem[]> {
	const { query, limit = 50, favoritesOnly = false, offset = 0 } = options;
	await waitForElectronAPI();
	return window.electronAPI.db.getHistory(query, limit, favoritesOnly, offset);
}

/**
 * @deprecated Use deleteHistoryItemResult for explicit error handling
 * Delete a history item by ID
 */
export async function deleteHistoryItem(id: number): Promise<void> {
	await waitForElectronAPI();
	window.electronAPI.db.deleteHistoryItem(id);
}

/**
 * @deprecated Use clearAllHistoryResult for explicit error handling
 * Clear all history
 */
export async function clearAllHistory(): Promise<void> {
	await waitForElectronAPI();
	window.electronAPI.db.clearAllHistory();
}

/**
 * @deprecated Use toggleFavoriteResult for explicit error handling
 * Toggle favorite status of a history item
 */
export async function toggleFavorite(id: number): Promise<boolean> {
	await waitForElectronAPI();
	return window.electronAPI.db.toggleFavorite(id);
}
