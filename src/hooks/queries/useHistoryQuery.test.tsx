import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockHistoryItems } from "../../test/mocks/history";
import { getMockElectronAPI } from "../../test/setup";
import { createTestQueryClient } from "../../test/utils";
import { flattenHistoryPages, useHistoryQuery } from "./useHistoryQuery";

describe("useHistoryQuery", () => {
	const createWrapper = () => {
		const queryClient = createTestQueryClient();
		return ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("returns loading state initially", () => {
		const mockApi = getMockElectronAPI();
		// Make the API call hang so we can observe loading state
		mockApi.db.getHistory.mockImplementation(
			() => new Promise(() => {}), // Never resolves
		);

		const { result } = renderHook(
			() => useHistoryQuery({ searchQuery: "", favoritesOnly: false }),
			{ wrapper: createWrapper() },
		);

		expect(result.current.isLoading).toBe(true);
		expect(result.current.data).toBeUndefined();
	});

	it("returns data after successful fetch", async () => {
		const mockItems = createMockHistoryItems(3);
		const mockApi = getMockElectronAPI();
		mockApi.db.getHistory.mockResolvedValue(mockItems);

		const { result } = renderHook(
			() => useHistoryQuery({ searchQuery: "", favoritesOnly: false }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.pages).toHaveLength(1);
		expect(result.current.data?.pages[0].items).toEqual(mockItems);
	});

	it("passes search query to getHistory", async () => {
		const mockApi = getMockElectronAPI();
		mockApi.db.getHistory.mockResolvedValue([]);

		const { result } = renderHook(
			() =>
				useHistoryQuery({ searchQuery: "test search", favoritesOnly: false }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockApi.db.getHistory).toHaveBeenCalledWith(
			"test search",
			100, // INITIAL_LOAD_COUNT
			false,
			0,
		);
	});

	it("trims whitespace from search query", async () => {
		const mockApi = getMockElectronAPI();
		mockApi.db.getHistory.mockResolvedValue([]);

		const { result } = renderHook(
			() => useHistoryQuery({ searchQuery: "  test  ", favoritesOnly: false }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockApi.db.getHistory).toHaveBeenCalledWith("test", 100, false, 0);
	});

	it("passes favoritesOnly to getHistory", async () => {
		const mockApi = getMockElectronAPI();
		mockApi.db.getHistory.mockResolvedValue([]);

		const { result } = renderHook(
			() => useHistoryQuery({ searchQuery: "", favoritesOnly: true }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockApi.db.getHistory).toHaveBeenCalledWith("", 100, true, 0);
	});

	it("determines hasNextPage correctly when more items exist", async () => {
		// Return exactly INITIAL_LOAD_COUNT items to indicate there may be more
		const mockItems = createMockHistoryItems(100);
		const mockApi = getMockElectronAPI();
		mockApi.db.getHistory.mockResolvedValue(mockItems);

		const { result } = renderHook(
			() => useHistoryQuery({ searchQuery: "", favoritesOnly: false }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.hasNextPage).toBe(true);
	});

	it("determines hasNextPage correctly when no more items", async () => {
		// Return fewer items than batch size to indicate no more items
		const mockItems = createMockHistoryItems(50);
		const mockApi = getMockElectronAPI();
		mockApi.db.getHistory.mockResolvedValue(mockItems);

		const { result } = renderHook(
			() => useHistoryQuery({ searchQuery: "", favoritesOnly: false }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.hasNextPage).toBe(false);
	});
});

describe("flattenHistoryPages", () => {
	it("returns empty array when pages is undefined", () => {
		const result = flattenHistoryPages(undefined);
		expect(result).toEqual([]);
	});

	it("returns empty array when pages is empty", () => {
		const result = flattenHistoryPages([]);
		expect(result).toEqual([]);
	});

	it("flattens single page correctly", () => {
		const items = createMockHistoryItems(3);
		const pages = [{ items, nextOffset: undefined }];

		const result = flattenHistoryPages(pages);

		expect(result).toEqual(items);
	});

	it("flattens multiple pages correctly", () => {
		const items1 = createMockHistoryItems(2);
		const items2 = createMockHistoryItems(2);
		const pages = [
			{ items: items1, nextOffset: 2 },
			{ items: items2, nextOffset: undefined },
		];

		const result = flattenHistoryPages(pages);

		expect(result).toHaveLength(4);
		expect(result).toEqual([...items1, ...items2]);
	});

	it("handles pages with empty items", () => {
		const items1 = createMockHistoryItems(2);
		const pages = [
			{ items: items1, nextOffset: 2 },
			{ items: [], nextOffset: undefined },
		];

		const result = flattenHistoryPages(pages);

		expect(result).toEqual(items1);
	});
});
