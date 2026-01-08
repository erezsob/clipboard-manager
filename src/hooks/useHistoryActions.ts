import { useCallback, useState } from "react";
import {
	clearAllHistory,
	deleteHistoryItem,
	type HistoryItem,
	toggleFavorite,
} from "../lib/db";
import { retryOperation } from "../lib/utils";

interface UseHistoryActionsOptions {
	/** Function to refresh the main history from useClipboard */
	refreshHistory: () => Promise<void>;
	/** Function to refresh filtered/searched history from useHistorySearch */
	refreshFilteredHistory: () => Promise<void>;
	/** Function to reset pagination state */
	resetPagination: () => void;
	/** Current filtered history array for index calculations */
	filteredHistory: HistoryItem[];
	/** Current selected index for adjustments after delete */
	selectedIndex: number;
	/** Function to update selected index */
	setSelectedIndex: (index: number) => void;
	/** Callback when window should be hidden after copy */
	onHideWindow: () => Promise<void>;
}

interface UseHistoryActionsReturn {
	/** Current error message, or null if no error */
	error: string | null;
	/** Set or clear the error message */
	setError: (error: string | null) => void;
	/** Copy item to clipboard and hide window */
	handleItemClick: (item: HistoryItem) => Promise<void>;
	/** Toggle favorite status of an item */
	handleToggleFavorite: (e: React.MouseEvent, itemId: number) => Promise<void>;
	/** Delete a history item */
	handleDeleteItem: (e: React.MouseEvent, itemId: number) => Promise<void>;
	/** Clear all history with confirmation */
	handleClearAll: () => Promise<boolean>;
}

/**
 * Hook that manages history item actions (copy, delete, favorite, clear)
 * Encapsulates all item-related operations with error handling
 * @param options - Configuration options for the hook
 * @returns Action handlers and error state
 */
export function useHistoryActions({
	refreshHistory,
	refreshFilteredHistory,
	resetPagination,
	filteredHistory,
	selectedIndex,
	setSelectedIndex,
	onHideWindow,
}: UseHistoryActionsOptions): UseHistoryActionsReturn {
	const [error, setError] = useState<string | null>(null);

	/**
	 * Handles errors consistently across actions
	 */
	const handleError = useCallback((err: unknown, defaultMessage: string) => {
		const message = err instanceof Error ? err.message : String(err);
		setError(`${defaultMessage}: ${message}`);
		console.error(defaultMessage, err);
	}, []);

	/**
	 * Handles clicking on a history item to copy it to clipboard
	 */
	const handleItemClick = useCallback(
		async (item: HistoryItem) => {
			if (!window.electronAPI) return;

			try {
				setError(null);
				await retryOperation({
					operation: async () => {
						await window.electronAPI.clipboard.writeText(item.content);
					},
				});
				await onHideWindow();
				setSelectedIndex(0);
			} catch (err) {
				handleError(err, "Failed to copy to clipboard");
			}
		},
		[handleError, onHideWindow, setSelectedIndex],
	);

	/**
	 * Handles toggling favorite status of a history item
	 */
	const handleToggleFavorite = useCallback(
		async (e: React.MouseEvent, itemId: number) => {
			e.stopPropagation();
			try {
				setError(null);
				await toggleFavorite(itemId);
				await refreshHistory();
				await refreshFilteredHistory();
			} catch (err) {
				handleError(err, "Failed to toggle favorite");
			}
		},
		[handleError, refreshHistory, refreshFilteredHistory],
	);

	/**
	 * Handles deleting a history item
	 */
	const handleDeleteItem = useCallback(
		async (e: React.MouseEvent, itemId: number) => {
			e.stopPropagation();
			try {
				setError(null);
				await deleteHistoryItem(itemId);
				await refreshHistory();
				await refreshFilteredHistory();
				// Adjust selected index if deleted item was at the end
				if (selectedIndex >= filteredHistory.length - 1) {
					setSelectedIndex(Math.max(0, filteredHistory.length - 2));
				}
			} catch (err) {
				handleError(err, "Failed to delete item");
			}
		},
		[
			handleError,
			refreshHistory,
			refreshFilteredHistory,
			selectedIndex,
			filteredHistory.length,
			setSelectedIndex,
		],
	);

	/**
	 * Handles clearing all clipboard history with confirmation
	 * @returns true if history was cleared, false if cancelled
	 */
	const handleClearAll = useCallback(async (): Promise<boolean> => {
		const confirmed = window.confirm(
			"Are you sure you want to clear all clipboard history? This action cannot be undone.",
		);
		if (!confirmed) return false;

		try {
			setError(null);
			await clearAllHistory();
			await refreshHistory();
			resetPagination();
			setSelectedIndex(0);
			return true;
		} catch (err) {
			handleError(err, "Failed to clear history");
			return false;
		}
	}, [handleError, refreshHistory, resetPagination, setSelectedIndex]);

	return {
		error,
		setError,
		handleItemClick,
		handleToggleFavorite,
		handleDeleteItem,
		handleClearAll,
	};
}
