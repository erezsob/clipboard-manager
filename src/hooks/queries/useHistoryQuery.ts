import { useInfiniteQuery } from "@tanstack/react-query";
import { INITIAL_LOAD_COUNT, PAGINATION_BATCH_SIZE } from "../../lib/constants";
import { getHistoryResult, type HistoryItem } from "../../lib/db";
import { type HistoryQueryFilters, historyKeys } from "../../lib/queryKeys";
import { hasMoreItems } from "../../lib/utils";
import type { HistoryPage } from "./types";

interface UseHistoryQueryOptions {
	/** Search query string */
	searchQuery: string;
	/** Whether to show only favorites */
	favoritesOnly: boolean;
}

interface FetchHistoryPageOptions {
	/** Search and filter parameters */
	filters: HistoryQueryFilters;
	/** Page offset for pagination */
	offset: number;
	/** Number of items to fetch */
	limit: number;
}

/**
 * Fetches a page of history items based on filters
 * @param options - Fetch options including filters, offset, and limit
 */
async function fetchHistoryPage({
	filters,
	offset,
	limit,
}: FetchHistoryPageOptions): Promise<HistoryPage> {
	const { searchQuery, favoritesOnly } = filters;

	const result = await getHistoryResult({
		limit,
		offset,
		query: searchQuery.trim(),
		favoritesOnly,
	});

	if (!result.ok) {
		console.error("Failed to get history:", result.error.message);
		throw result.error;
	}
	const items = result.value;
	// Determine if there are more items to load
	const hasMore = hasMoreItems(items.length, limit);
	const nextOffset = hasMore ? offset + limit : undefined;

	return { items, nextOffset };
}

/**
 * Hook for fetching paginated history with search and filter support
 * Uses TanStack Query's useInfiniteQuery for "Load More" functionality
 *
 * @param options - Query options including search and filter parameters
 * @returns Query result with data, loading states, and pagination functions
 */
export function useHistoryQuery({
	searchQuery,
	favoritesOnly,
}: UseHistoryQueryOptions) {
	const filters: HistoryQueryFilters = { searchQuery, favoritesOnly };

	return useInfiniteQuery({
		queryKey: historyKeys.list(filters),
		queryFn: ({ pageParam = 0 }) =>
			fetchHistoryPage({
				filters,
				offset: pageParam,
				limit: pageParam === 0 ? INITIAL_LOAD_COUNT : PAGINATION_BATCH_SIZE,
			}),
		initialPageParam: 0,
		getNextPageParam: (lastPage) => lastPage.nextOffset,
		// Keep previous data while fetching new data on filter change
		placeholderData: (previousData) => previousData,
	});
}

/**
 * Flattens paginated history data into a single array
 * @param pages - Array of history pages from infinite query
 * @returns Flattened array of history items
 */
export function flattenHistoryPages(
	pages: HistoryPage[] | undefined,
): HistoryItem[] {
	if (!pages) return [];
	return pages.flatMap((page) => page.items);
}
