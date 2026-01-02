export interface HistoryItem {
	id: number;
	content: string;
	type: string;
	created_at: string;
}


/**
 * Add a clipboard entry if it's different from the most recent entry
 */
export async function addClip(text: string): Promise<void> {
	if (!window.electronAPI) {
		await waitForElectronAPI();
	}
	await window.electronAPI.db.addClip(text);
}

/**
 * Wait for Electron API to be available
 */
async function waitForElectronAPI(maxAttempts = 50): Promise<void> {
	let attempts = 0;
	while (attempts < maxAttempts) {
		if (window.electronAPI) {
			return;
		}
		attempts++;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error('Electron API not available after waiting');
}

/**
 * Get the last 50 history items
 */
export async function getHistory(limit: number = 50): Promise<HistoryItem[]> {
	if (!window.electronAPI) {
		await waitForElectronAPI();
	}
	return await window.electronAPI.db.getHistory(limit);
}

/**
 * Search history by content
 */
export async function searchHistory(
	query: string,
	limit: number = 50,
): Promise<HistoryItem[]> {
	if (!window.electronAPI) {
		await waitForElectronAPI();
	}
	return await window.electronAPI.db.searchHistory(query, limit);
}

/**
 * Delete a history item by ID
 */
export async function deleteHistoryItem(id: number): Promise<void> {
	if (!window.electronAPI) {
		await waitForElectronAPI();
	}
	await window.electronAPI.db.deleteHistoryItem(id);
}

/**
 * Clear all history
 */
export async function clearAllHistory(): Promise<void> {
	if (!window.electronAPI) {
		await waitForElectronAPI();
	}
	await window.electronAPI.db.clearAllHistory();
}
