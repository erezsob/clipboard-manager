import { useCallback, useEffect, useRef, useState } from "react";
import type { HistoryItem } from "../lib/db";
import { usePagination } from "./usePagination";
import { usePrevious } from "./usePrevious";

interface UseHistorySearchOptions {
	/** The full history array from useClipboard */
	history: HistoryItem[];
}

interface UseHistorySearchReturn {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	favoritesOnly: boolean;
	setFavoritesOnly: (value: boolean) => void;
	filteredHistory: HistoryItem[];
	isLoadingMore: boolean;
	hasMore: boolean;
	/** Current search error, or null if no error */
	searchError: string | null;
	/** Clear the current search error */
	clearSearchError: () => void;
	refreshFilteredHistory: () => Promise<void>;
	loadMore: () => Promise<void>;
	resetPagination: () => void;
}

/**
 * Hook that manages search query, favorites filter, and filtered history
 * Handles search/filter changes and integrates with pagination
 * @returns Search state, filter state, and pagination results
 */
export function useHistorySearch({
	history,
}: UseHistorySearchOptions): UseHistorySearchReturn {
	const [searchQuery, setSearchQuery] = useState("");
	const [favoritesOnly, setFavoritesOnly] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const prevSearchQuery = usePrevious(searchQuery);
	const prevFavoritesOnly = usePrevious(favoritesOnly);

	// Track if we've already triggered refresh for current search/filter values
	const lastRefreshedKey = useRef<string>("");

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

	// Refresh filtered history when search or filter changes
	// Uses a ref to track refreshed state and avoid infinite loops
	useEffect(() => {
		const currentKey = `${searchQuery}|${favoritesOnly}`;
		const searchOrFilterChanged =
			prevSearchQuery !== searchQuery || prevFavoritesOnly !== favoritesOnly;

		// Only refresh if search/filter actually changed and we haven't already refreshed
		if (!searchOrFilterChanged || lastRefreshedKey.current === currentKey) {
			return;
		}

		lastRefreshedKey.current = currentKey;

		const refresh = async () => {
			try {
				setSearchError(null);
				resetPagination();
				await refreshFilteredHistory();
			} catch (error) {
				console.error("Failed to refresh history:", error);
				setSearchError("Failed to search history. Please try again.");
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
	]);

	const clearSearchError = useCallback(() => {
		setSearchError(null);
	}, []);

	return {
		searchQuery,
		setSearchQuery,
		favoritesOnly,
		setFavoritesOnly,
		filteredHistory,
		isLoadingMore,
		hasMore,
		searchError,
		clearSearchError,
		refreshFilteredHistory,
		loadMore,
		resetPagination,
	};
}
