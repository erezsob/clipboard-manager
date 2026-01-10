import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { historyKeys } from "../../lib/queryKeys";
import { createMockHistoryItems } from "../../test/mocks/history";
import { getMockElectronAPI } from "../../test/setup";
import { createTestQueryClient } from "../../test/utils";
import type { InfiniteHistoryData } from "./types";
import {
	useClearHistoryMutation,
	useDeleteItemMutation,
	useToggleFavoriteMutation,
} from "./useHistoryMutations";

describe("useDeleteItemMutation", () => {
	const createWrapper = (queryClient = createTestQueryClient()) => {
		return ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("calls deleteHistoryItem with correct id", async () => {
		const mockApi = getMockElectronAPI();
		mockApi.db.deleteHistoryItem.mockResolvedValue(undefined);

		const { result } = renderHook(() => useDeleteItemMutation(), {
			wrapper: createWrapper(),
		});

		await act(async () => {
			await result.current.mutateAsync(123);
		});

		expect(mockApi.db.deleteHistoryItem).toHaveBeenCalledWith(123);
	});

	it("optimistically removes item from cache", async () => {
		const mockApi = getMockElectronAPI();
		// Make the mutation slow so we can observe optimistic update
		mockApi.db.deleteHistoryItem.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 100)),
		);

		const queryClient = createTestQueryClient();
		const mockItems = createMockHistoryItems(3);
		const initialData: InfiniteHistoryData = {
			pages: [{ items: mockItems, nextOffset: undefined }],
			pageParams: [0],
		};

		// Pre-populate the cache
		queryClient.setQueryData(
			historyKeys.list({ searchQuery: "", favoritesOnly: false }),
			initialData,
		);

		const { result } = renderHook(() => useDeleteItemMutation(), {
			wrapper: createWrapper(queryClient),
		});

		// Start the mutation but don't wait for it
		act(() => {
			result.current.mutate(mockItems[0].id);
		});

		// Check that item was optimistically removed
		await waitFor(() => {
			const cachedData = queryClient.getQueryData<InfiniteHistoryData>(
				historyKeys.list({ searchQuery: "", favoritesOnly: false }),
			);
			expect(cachedData?.pages[0].items).toHaveLength(2);
			expect(
				cachedData?.pages[0].items.find((i) => i.id === mockItems[0].id),
			).toBeUndefined();
		});
	});

	it("invalidates queries after mutation", async () => {
		const mockApi = getMockElectronAPI();
		mockApi.db.deleteHistoryItem.mockResolvedValue(undefined);

		const queryClient = createTestQueryClient();
		const mockItems = createMockHistoryItems(3);
		const initialData: InfiniteHistoryData = {
			pages: [{ items: [...mockItems], nextOffset: undefined }],
			pageParams: [0],
		};

		queryClient.setQueryData(
			historyKeys.list({ searchQuery: "", favoritesOnly: false }),
			initialData,
		);

		// Spy on invalidateQueries
		const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

		const { result } = renderHook(() => useDeleteItemMutation(), {
			wrapper: createWrapper(queryClient),
		});

		await act(async () => {
			await result.current.mutateAsync(mockItems[0].id);
		});

		// Verify queries are invalidated on settlement
		expect(invalidateSpy).toHaveBeenCalledWith({
			queryKey: historyKeys.all,
		});
	});
});

describe("useToggleFavoriteMutation", () => {
	const createWrapper = (queryClient = createTestQueryClient()) => {
		return ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("calls toggleFavorite with correct id", async () => {
		const mockApi = getMockElectronAPI();
		mockApi.db.toggleFavorite.mockResolvedValue(true);

		const { result } = renderHook(() => useToggleFavoriteMutation(), {
			wrapper: createWrapper(),
		});

		await act(async () => {
			await result.current.mutateAsync(123);
		});

		expect(mockApi.db.toggleFavorite).toHaveBeenCalledWith(123);
	});

	it("optimistically toggles favorite status from 0 to 1", async () => {
		const mockApi = getMockElectronAPI();
		mockApi.db.toggleFavorite.mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve(true), 100)),
		);

		const queryClient = createTestQueryClient();
		const mockItems = createMockHistoryItems(3);
		mockItems[0].is_favorite = 0;
		const initialData: InfiniteHistoryData = {
			pages: [{ items: mockItems, nextOffset: undefined }],
			pageParams: [0],
		};

		queryClient.setQueryData(
			historyKeys.list({ searchQuery: "", favoritesOnly: false }),
			initialData,
		);

		const { result } = renderHook(() => useToggleFavoriteMutation(), {
			wrapper: createWrapper(queryClient),
		});

		act(() => {
			result.current.mutate(mockItems[0].id);
		});

		// Check optimistic update
		await waitFor(() => {
			const cachedData = queryClient.getQueryData<InfiniteHistoryData>(
				historyKeys.list({ searchQuery: "", favoritesOnly: false }),
			);
			expect(cachedData?.pages[0].items[0].is_favorite).toBe(1);
		});
	});

	it("optimistically toggles favorite status from 1 to 0", async () => {
		const mockApi = getMockElectronAPI();
		mockApi.db.toggleFavorite.mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve(false), 100)),
		);

		const queryClient = createTestQueryClient();
		const mockItems = createMockHistoryItems(3);
		mockItems[0].is_favorite = 1;
		const initialData: InfiniteHistoryData = {
			pages: [{ items: mockItems, nextOffset: undefined }],
			pageParams: [0],
		};

		queryClient.setQueryData(
			historyKeys.list({ searchQuery: "", favoritesOnly: false }),
			initialData,
		);

		const { result } = renderHook(() => useToggleFavoriteMutation(), {
			wrapper: createWrapper(queryClient),
		});

		act(() => {
			result.current.mutate(mockItems[0].id);
		});

		await waitFor(() => {
			const cachedData = queryClient.getQueryData<InfiniteHistoryData>(
				historyKeys.list({ searchQuery: "", favoritesOnly: false }),
			);
			expect(cachedData?.pages[0].items[0].is_favorite).toBe(0);
		});
	});

	it("rolls back on error", async () => {
		const mockApi = getMockElectronAPI();
		mockApi.db.toggleFavorite.mockRejectedValue(new Error("Toggle failed"));

		const queryClient = createTestQueryClient();
		const mockItems = createMockHistoryItems(3);
		mockItems[0].is_favorite = 0;
		const initialData: InfiniteHistoryData = {
			pages: [{ items: mockItems, nextOffset: undefined }],
			pageParams: [0],
		};

		queryClient.setQueryData(
			historyKeys.list({ searchQuery: "", favoritesOnly: false }),
			initialData,
		);

		const { result } = renderHook(() => useToggleFavoriteMutation(), {
			wrapper: createWrapper(queryClient),
		});

		await act(async () => {
			try {
				await result.current.mutateAsync(mockItems[0].id);
			} catch {
				// Expected to fail
			}
		});

		// Should be rolled back to original value
		await waitFor(() => {
			const cachedData = queryClient.getQueryData<InfiniteHistoryData>(
				historyKeys.list({ searchQuery: "", favoritesOnly: false }),
			);
			expect(cachedData?.pages[0].items[0].is_favorite).toBe(0);
		});
	});
});

describe("useClearHistoryMutation", () => {
	const createWrapper = (queryClient = createTestQueryClient()) => {
		return ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("calls clearAllHistory", async () => {
		const mockApi = getMockElectronAPI();
		mockApi.db.clearAllHistory.mockResolvedValue(undefined);

		const { result } = renderHook(() => useClearHistoryMutation(), {
			wrapper: createWrapper(),
		});

		await act(async () => {
			await result.current.mutateAsync();
		});

		expect(mockApi.db.clearAllHistory).toHaveBeenCalled();
	});

	it("clears cache on success", async () => {
		const mockApi = getMockElectronAPI();
		mockApi.db.clearAllHistory.mockResolvedValue(undefined);

		const queryClient = createTestQueryClient();
		const mockItems = createMockHistoryItems(3);
		const initialData: InfiniteHistoryData = {
			pages: [{ items: mockItems, nextOffset: undefined }],
			pageParams: [0],
		};

		queryClient.setQueryData(
			historyKeys.list({ searchQuery: "", favoritesOnly: false }),
			initialData,
		);

		const { result } = renderHook(() => useClearHistoryMutation(), {
			wrapper: createWrapper(queryClient),
		});

		await act(async () => {
			await result.current.mutateAsync();
		});

		// Cache should be cleared
		const cachedData = queryClient.getQueryData<InfiniteHistoryData>(
			historyKeys.list({ searchQuery: "", favoritesOnly: false }),
		);
		expect(cachedData?.pages[0].items).toHaveLength(0);
	});
});
