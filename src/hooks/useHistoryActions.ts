import { useCallback, useState } from "react";
import type { HistoryItem } from "../lib/db";
import {
	useClearHistoryMutation,
	useDeleteItemMutation,
	useToggleFavoriteMutation,
} from "./queries";
import {
	calculateIndexAfterDelete,
	formatActionError,
	writeToClipboardWithRetry,
} from "./queries/utils";

interface UseHistoryActionsOptions {
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
 * Uses TanStack Query mutations for data operations with optimistic updates
 *
 * @param options - Configuration options for the hook
 * @returns Action handlers and error state
 */
export function useHistoryActions({
	filteredHistory,
	selectedIndex,
	setSelectedIndex,
	onHideWindow,
}: UseHistoryActionsOptions): UseHistoryActionsReturn {
	const [error, setError] = useState<string | null>(null);

	// TanStack Query mutations
	const deleteItemMutation = useDeleteItemMutation();
	const toggleFavoriteMutation = useToggleFavoriteMutation();
	const clearHistoryMutation = useClearHistoryMutation();

	/**
	 * Handles errors consistently across actions
	 */
	const handleError = useCallback((err: unknown, defaultMessage: string) => {
		const message = formatActionError(defaultMessage, err);
		setError(message);
		console.error(defaultMessage, err);
	}, []);

	/**
	 * Handles clicking on a history item to copy it to clipboard
	 */
	const handleItemClick = useCallback(
		async (item: HistoryItem) => {
			setError(null);

			const result = await writeToClipboardWithRetry(item.content);

			if (result.ok) {
				await onHideWindow();
				setSelectedIndex(0);
			} else {
				handleError(result.error, "Failed to copy to clipboard");
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
				await toggleFavoriteMutation.mutateAsync(itemId);
			} catch (err) {
				handleError(err, "Failed to toggle favorite");
			}
		},
		[handleError, toggleFavoriteMutation],
	);

	/**
	 * Handles deleting a history item
	 */
	const handleDeleteItem = useCallback(
		async (e: React.MouseEvent, itemId: number) => {
			e.stopPropagation();
			try {
				setError(null);
				await deleteItemMutation.mutateAsync(itemId);
				// Adjust selected index if necessary using pure function
				const newIndex = calculateIndexAfterDelete(
					selectedIndex,
					filteredHistory.length,
				);
				if (newIndex !== selectedIndex) {
					setSelectedIndex(newIndex);
				}
			} catch (err) {
				handleError(err, "Failed to delete item");
			}
		},
		[
			handleError,
			deleteItemMutation,
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
			await clearHistoryMutation.mutateAsync();
			setSelectedIndex(0);
			return true;
		} catch (err) {
			handleError(err, "Failed to clear history");
			return false;
		}
	}, [handleError, clearHistoryMutation, setSelectedIndex]);

	return {
		error,
		setError,
		handleItemClick,
		handleToggleFavorite,
		handleDeleteItem,
		handleClearAll,
	};
}
