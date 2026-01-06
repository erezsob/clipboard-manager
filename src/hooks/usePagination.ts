import { useCallback, useState } from "react";
import { INITIAL_LOAD_COUNT, PAGINATION_BATCH_SIZE } from "../lib/constants";
import { getHistory, type HistoryItem, searchHistory } from "../lib/db";
import { hasMoreItems } from "../lib/utils";

interface UsePaginationOptions {
	searchQuery: string;
	favoritesOnly: boolean;
	history: HistoryItem[];
}

interface UsePaginationReturn {
	filteredHistory: HistoryItem[];
	loadedCount: number;
	isLoadingMore: boolean;
	hasMore: boolean;
	refreshFilteredHistory: () => Promise<void>;
	loadMore: () => Promise<void>;
	resetPagination: () => void;
}

/**
 * Custom hook for managing pagination state and operations
 * Handles loading, filtering, and pagination of history items
 */
export function usePagination({
	searchQuery,
	favoritesOnly,
	history,
}: UsePaginationOptions): UsePaginationReturn {
	const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
	const [loadedCount, setLoadedCount] = useState(INITIAL_LOAD_COUNT);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);

	/**
	 * Loads history items based on current filters and pagination state
	 */
	const loadFilteredHistory = useCallback(
		async (limit: number, offset: number = 0): Promise<HistoryItem[]> => {
			const trimmedQuery = searchQuery.trim();

			if (trimmedQuery === "") {
				if (favoritesOnly) {
					return await searchHistory("", limit, true, offset);
				}
				// For non-favorites, use in-memory history if available
				if (offset === 0 && history.length > 0) {
					return history.slice(0, limit);
				}
				return await getHistory(limit, false, offset);
			}

			return await searchHistory(trimmedQuery, limit, favoritesOnly, offset);
		},
		[searchQuery, favoritesOnly, history],
	);

	/**
	 * Refreshes the filtered history with current pagination state
	 */
	const refreshFilteredHistory = useCallback(async () => {
		try {
			const currentLoadedCount = loadedCount;
			const results = await loadFilteredHistory(currentLoadedCount, 0);
			setFilteredHistory(results);
			setHasMore(hasMoreItems(results.length, currentLoadedCount));
		} catch (error) {
			console.error("Failed to refresh filtered history:", error);
			throw error;
		}
	}, [loadFilteredHistory, loadedCount]);

	/**
	 * Loads the next batch of items
	 */
	const loadMore = useCallback(async () => {
		if (isLoadingMore || !hasMore) return;

		setIsLoadingMore(true);
		try {
			const items = await loadFilteredHistory(
				PAGINATION_BATCH_SIZE,
				loadedCount,
			);
			setFilteredHistory((prev) => [...prev, ...items]);
			setHasMore(hasMoreItems(items.length, PAGINATION_BATCH_SIZE));
			setLoadedCount((prev) => prev + PAGINATION_BATCH_SIZE);
		} catch (error) {
			console.error("Failed to load more items:", error);
			throw error;
		} finally {
			setIsLoadingMore(false);
		}
	}, [isLoadingMore, hasMore, loadFilteredHistory, loadedCount]);

	/**
	 * Resets pagination to initial state
	 */
	const resetPagination = useCallback(() => {
		setLoadedCount(INITIAL_LOAD_COUNT);
		setHasMore(true);
		setFilteredHistory([]);
	}, []);

	return {
		filteredHistory,
		loadedCount,
		isLoadingMore,
		hasMore,
		refreshFilteredHistory,
		loadMore,
		resetPagination,
	};
}
