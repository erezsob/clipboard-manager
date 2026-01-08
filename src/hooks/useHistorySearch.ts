import { useEffect, useState } from "react";
import type { HistoryItem } from "../lib/db";
import { usePagination } from "./usePagination";
import { usePrevious } from "./usePrevious";

interface UseHistorySearchOptions {
	/** The full history array from useClipboard */
	history: HistoryItem[];
	/** Optional callback for search errors */
	onSearchError?: (error: string) => void;
}

/**
 * Hook that manages search query, favorites filter, and filtered history
 * Handles search/filter changes and integrates with pagination
 * @returns Search state, filter state, and pagination results
 */
export function useHistorySearch({
	history,
	onSearchError,
}: UseHistorySearchOptions) {
	const [searchQuery, setSearchQuery] = useState("");
	const [favoritesOnly, setFavoritesOnly] = useState(false);
	const prevSearchQuery = usePrevious(searchQuery);
	const prevFavoritesOnly = usePrevious(favoritesOnly);

	// Pagination hook manages filtered history and pagination state
	const {
		filteredHistory,
		isLoadingMore,
		hasMore,
		refreshFilteredHistory,
		loadMore,
		resetPagination,
	} = usePagination({
		searchQuery,
		favoritesOnly,
		history,
	});

	// Refresh filtered history when search, filter, or history changes
	// Only reset pagination when search or filter changes (not when history changes)
	useEffect(() => {
		const searchOrFilterChanged =
			prevSearchQuery !== searchQuery || prevFavoritesOnly !== favoritesOnly;

		const refresh = async () => {
			try {
				if (searchOrFilterChanged) {
					resetPagination();
				}
				await refreshFilteredHistory();
			} catch (error) {
				console.error("Failed to refresh history:", error);
				if (searchOrFilterChanged) {
					onSearchError?.("Failed to search history. Please try again.");
				}
			}
		};

		refresh();
	}, [
		searchQuery,
		favoritesOnly,
		prevSearchQuery,
		prevFavoritesOnly,
		resetPagination,
		refreshFilteredHistory,
		onSearchError,
	]);

	return {
		searchQuery,
		setSearchQuery,
		favoritesOnly,
		setFavoritesOnly,
		filteredHistory,
		isLoadingMore,
		hasMore,
		refreshFilteredHistory,
		loadMore,
		resetPagination,
	};
}
