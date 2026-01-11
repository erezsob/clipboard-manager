import { type DbError, queryFailed } from "./errors";
import { type Result, tryCatchAsync } from "./fp";
import { waitForElectronAPIResult } from "./utils";

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
	const apiResult = await waitForElectronAPIResult();
	if (!apiResult.ok) return apiResult;

	return tryCatchAsync(
		() => window.electronAPI.db.getHistory(options),
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
			await window.electronAPI.db.deleteHistoryItem(id);
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
			await window.electronAPI.db.clearAllHistory();
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

/**
 * Add a clipboard entry if it's different from the most recent entry.
 * Returns a Result for explicit error handling.
 */
export async function addClipResult(
	text: string,
): Promise<Result<void, DbError>> {
	const apiResult = await waitForElectronAPIResult();
	if (!apiResult.ok) return apiResult;

	return tryCatchAsync(
		async () => {
			await window.electronAPI.db.addClip(text);
		},
		(error) => queryFailed("Failed to add clip", error),
	);
}
