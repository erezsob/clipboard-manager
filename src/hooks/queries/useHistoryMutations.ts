import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	clearAllHistory,
	deleteHistoryItem,
	toggleFavorite,
} from "../../lib/db";
import { historyKeys } from "../../lib/queryKeys";
import type { InfiniteHistoryData } from "./types";

/**
 * Hook for deleting a history item with optimistic update
 * Removes item from cache immediately and rolls back on error
 */
export function useDeleteItemMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (itemId: number) => deleteHistoryItem(itemId),
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
				(old) => {
					if (!old) return old;
					return {
						...old,
						pages: old.pages.map((page) => ({
							...page,
							items: page.items.filter((item) => item.id !== itemId),
						})),
					};
				},
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
		mutationFn: (itemId: number) => toggleFavorite(itemId),
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
				(old) => {
					if (!old) return old;
					return {
						...old,
						pages: old.pages.map((page) => ({
							...page,
							items: page.items.map((item) =>
								item.id === itemId
									? { ...item, is_favorite: item.is_favorite === 1 ? 0 : 1 }
									: item,
							),
						})),
					};
				},
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
		mutationFn: () => clearAllHistory(),
		onSuccess: () => {
			// Clear all history data from cache
			queryClient.setQueriesData<InfiniteHistoryData>(
				{ queryKey: historyKeys.all },
				(old) => {
					if (!old) return old;
					return {
						...old,
						pages: [{ items: [], nextOffset: undefined }],
						pageParams: [0],
					};
				},
			);
			// Invalidate to refetch
			queryClient.invalidateQueries({ queryKey: historyKeys.all });
		},
	});
}
