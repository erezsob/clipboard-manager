/**
 * Query key factory for TanStack Query
 * Provides consistent query keys for cache management
 */

export interface HistoryQueryFilters {
	/** Search query string */
	searchQuery: string;
	/** Whether to show only favorites */
	favoritesOnly: boolean;
}

/**
 * Query key factory for history-related queries
 * Uses a hierarchical structure for proper cache invalidation
 */
export const historyKeys = {
	/** Base key for all history queries */
	all: ["history"] as const,

	/**
	 * Key for history list queries with optional filters
	 * @param filters - Optional search and filter parameters
	 */
	list: (filters?: HistoryQueryFilters) =>
		filters
			? ([...historyKeys.all, "list", filters] as const)
			: ([...historyKeys.all, "list"] as const),

	/**
	 * Key for a single history item by ID
	 * @param id - The history item ID
	 */
	detail: (id: number) => [...historyKeys.all, "detail", id] as const,
} as const;
