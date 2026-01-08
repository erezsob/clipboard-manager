import { useCallback, useState } from "react";
import type { HistoryItem } from "../lib/db";
import { flattenHistoryPages, useHistoryQuery } from "./queries";

interface UseHistorySearchReturn {
	/** Current search query string */
	searchQuery: string;
	/** Update the search query */
	setSearchQuery: (query: string) => void;
	/** Whether to show only favorites */
	favoritesOnly: boolean;
	/** Update the favorites filter */
	setFavoritesOnly: (value: boolean) => void;
	/** Flattened array of history items from all loaded pages */
	filteredHistory: HistoryItem[];
	/** Whether more pages are being loaded */
	isLoadingMore: boolean;
	/** Whether there are more pages to load */
	hasMore: boolean;
	/** Current error message, or null if no error (auto-clears on successful refetch) */
	searchError: string | null;
	/** Refetch the history data */
	refetchHistory: () => Promise<void>;
	/** Load the next page of results */
	loadMore: () => Promise<void>;
}

/**
 * Hook that manages search query, favorites filter, and filtered history
 * Integrates with TanStack Query for data fetching and caching
 *
 * @returns Search state, filter state, and query results
 */
export function useHistorySearch(): UseHistorySearchReturn {
	const [searchQuery, setSearchQuery] = useState("");
	const [favoritesOnly, setFavoritesOnly] = useState(false);

	// Use TanStack Query for data fetching
	const {
		data,
		error,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		refetch,
	} = useHistoryQuery({
		searchQuery,
		favoritesOnly,
	});

	// Flatten paginated data into a single array
	const filteredHistory = flattenHistoryPages(data?.pages);

	// Convert error to string for display
	// Note: TanStack Query automatically clears errors on successful refetch
	const searchError = error ? String(error.message || error) : null;

	/**
	 * Refetch the history data
	 */
	const refetchHistory = useCallback(async () => {
		await refetch();
	}, [refetch]);

	/**
	 * Load the next page of results
	 */
	const loadMore = useCallback(async () => {
		if (hasNextPage && !isFetchingNextPage) {
			await fetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	return {
		searchQuery,
		setSearchQuery,
		favoritesOnly,
		setFavoritesOnly,
		filteredHistory,
		isLoadingMore: isFetchingNextPage,
		hasMore: hasNextPage ?? false,
		searchError,
		refetchHistory,
		loadMore,
	};
}
