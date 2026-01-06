export interface HistoryItem {
	id: number;
	content: string;
	type: string;
	created_at: string;
	is_favorite: number;
}

async function waitFor(condition: () => boolean, maxAttempts = 50) {
	let attempts = 0;
	while (attempts < maxAttempts) {
		if (condition()) {
			return;
		}
		attempts++;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error("Condition not met after waiting");
}

async function waitForElectronAPI() {
	await waitFor(() => window.electronAPI !== undefined);
}

/**
 * Add a clipboard entry if it's different from the most recent entry
 */
export async function addClip(text: string) {
	await waitForElectronAPI();
	window.electronAPI.db.addClip(text);
}

export interface GetHistoryOptions {
	limit?: number;
	favoritesOnly?: boolean;
	offset?: number;
}

/**
 * Get history items with pagination support
 */
export async function getHistory(options: GetHistoryOptions = {}) {
	const { limit = 50, favoritesOnly = false, offset = 0 } = options;
	await waitForElectronAPI();
	return window.electronAPI.db.getHistory(limit, favoritesOnly, offset);
}

export interface SearchHistoryOptions extends GetHistoryOptions {
	query: string;
}

/**
 * Search history by content with pagination support
 */
export async function searchHistory(options: SearchHistoryOptions) {
	const { query, limit = 50, favoritesOnly = false, offset = 0 } = options;
	await waitForElectronAPI();
	return window.electronAPI.db.searchHistory(
		query,
		limit,
		favoritesOnly,
		offset,
	);
}

/**
 * Delete a history item by ID
 */
export async function deleteHistoryItem(id: number) {
	await waitForElectronAPI();
	window.electronAPI.db.deleteHistoryItem(id);
}

/**
 * Clear all history
 */
export async function clearAllHistory() {
	await waitForElectronAPI();
	window.electronAPI.db.clearAllHistory();
}

/**
 * Toggle favorite status of a history item
 */
export async function toggleFavorite(id: number): Promise<boolean> {
	await waitForElectronAPI();
	return window.electronAPI.db.toggleFavorite(id);
}
