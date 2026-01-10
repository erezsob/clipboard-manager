import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	clearAllHistoryResult,
	deleteHistoryItemResult,
	toggleFavoriteResult,
} from "../../lib/db";
import { historyKeys } from "../../lib/queryKeys";
import type { InfiniteHistoryData } from "../queries/types";
import {
	applyTransform,
	clearAllPages,
	removeItemFromPages,
	toggleItemFavorite,
} from "../queries/utils";

/**
 * Hook for deleting a history item with optimistic update
 * Removes item from cache immediately and rolls back on error
 */
export function useDeleteItemMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (itemId: number) => {
			const result = await deleteHistoryItemResult(itemId);
			if (!result.ok) {
				console.error("Failed to delete item:", result.error.message);
				throw result.error;
			}
		},
		onMutate: async (itemId) => {
			// Cancel any outgoing refetches to avoid overwriting optimistic update
			await queryClient.cancelQueries({ queryKey: historyKeys.all });

			// Snapshot previous value for rollback
			const previousData = queryClient.getQueriesData<InfiniteHistoryData>({
				queryKey: historyKeys.all,
			});

			// Optimistically remove item from all history queries
			queryClient.setQueriesData<InfiniteHistoryData>(
				{ queryKey: historyKeys.all },
				applyTransform(removeItemFromPages(itemId)),
			);

			return { previousData };
		},
		onError: (_err, _itemId, context) => {
			// Rollback to previous state on error
			if (context?.previousData) {
				for (const [queryKey, data] of context.previousData) {
					queryClient.setQueryData(queryKey, data);
				}
			}
		},
		onSettled: () => {
			// Refetch to ensure consistency with server state
			queryClient.invalidateQueries({ queryKey: historyKeys.all });
		},
	});
}

/**
 * Hook for toggling favorite status with optimistic update
 * Updates item in cache immediately and rolls back on error
 */
export function useToggleFavoriteMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (itemId: number) => {
			const result = await toggleFavoriteResult(itemId);
			if (!result.ok) {
				console.error("Failed to toggle favorite:", result.error.message);
				throw result.error;
			}
		},
		onMutate: async (itemId) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: historyKeys.all });

			// Snapshot previous value
			const previousData = queryClient.getQueriesData<InfiniteHistoryData>({
				queryKey: historyKeys.all,
			});

			// Optimistically toggle favorite status
			queryClient.setQueriesData<InfiniteHistoryData>(
				{ queryKey: historyKeys.all },
				applyTransform(toggleItemFavorite(itemId)),
			);

			return { previousData };
		},
		onError: (_err, _itemId, context) => {
			// Rollback on error
			if (context?.previousData) {
				for (const [queryKey, data] of context.previousData) {
					queryClient.setQueryData(queryKey, data);
				}
			}
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: historyKeys.all });
		},
	});
}

/**
 * Hook for clearing all history
 * Invalidates all history queries on success
 */
export function useClearHistoryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const result = await clearAllHistoryResult();
			if (!result.ok) {
				console.error("Failed to clear all history:", result.error.message);
				throw result.error;
			}
		},
		onSuccess: () => {
			// Clear all history data from cache using pure transformation
			queryClient.setQueriesData<InfiniteHistoryData>(
				{ queryKey: historyKeys.all },
				applyTransform(clearAllPages),
			);
			// Invalidate to refetch
			queryClient.invalidateQueries({ queryKey: historyKeys.all });
		},
	});
}
