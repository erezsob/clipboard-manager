export interface HistoryItem {
	id: number;
	content: string;
	type: string;
	created_at: string;
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

/**
 * Get the last 50 history items
 */
export async function getHistory(limit: number = 50) {
	await waitForElectronAPI();
	return window.electronAPI.db.getHistory(limit);
}

/**
 * Search history by content
 */
export async function searchHistory(query: string, limit: number = 50) {
	await waitForElectronAPI();
	return window.electronAPI.db.searchHistory(query, limit);
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
