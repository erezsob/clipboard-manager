import { type DbError, queryFailed } from "./errors";
import { type Result, tryCatchAsync } from "./fp";
import { waitForElectronAPIResult } from "./utils";

export interface HistoryItem {
	id: number;
	content: string;
	type: string;
	created_at: string;
	is_favorite: number;
	rtf: string | null;
}

export interface GetHistoryOptions {
	query?: string;
	limit?: number;
	favoritesOnly?: boolean;
	offset?: number;
}

async function withElectronAPI<T>(
	operation: () => Promise<T>,
	errorMessage: string,
): Promise<Result<T, DbError>> {
	const apiResult = await waitForElectronAPIResult();
	if (!apiResult.ok) return apiResult;

	return tryCatchAsync(operation, (error) => queryFailed(errorMessage, error));
}

/**
 * Get history items with pagination support.
 * Returns a Result for explicit error handling.
 */
export const getHistoryResult = (options: GetHistoryOptions = {}) =>
	withElectronAPI(
		() => window.electronAPI.db.getHistory(options),
		"Failed to get history",
	);

/**
 * Delete a history item by ID.
 * Returns a Result for explicit error handling.
 */
export async function deleteHistoryItemResult(
	id: number,
): Promise<Result<void, DbError>> {
	return withElectronAPI(
		() => window.electronAPI.db.deleteHistoryItem(id),
		"Failed to delete history item",
	);
}

/**
 * Clear all history.
 * Returns a Result for explicit error handling.
 */
export async function clearAllHistoryResult(): Promise<Result<void, DbError>> {
	return withElectronAPI(
		() => window.electronAPI.db.clearAllHistory(),
		"Failed to clear all history",
	);
}

/**
 * Toggle favorite status of a history item.
 * Returns a Result containing the new favorite state.
 */
export async function toggleFavoriteResult(
	id: number,
): Promise<Result<boolean, DbError>> {
	return withElectronAPI(
		() => window.electronAPI.db.toggleFavorite(id),
		"Failed to toggle favorite",
	);
}

/**
 * Add a clipboard entry to the database.
 * Deduplication is performed in the database layer (electron/main.ts).
 * Returns a Result for explicit error handling.
 */
export async function addClipResult(
	data: ClipboardData,
): Promise<Result<void, DbError>> {
	return withElectronAPI(
		() => window.electronAPI.db.addClip(data),
		"Failed to add clip",
	);
}
