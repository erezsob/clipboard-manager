import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockHistoryItems } from "../test/mocks/history";
import { getMockElectronAPI } from "../test/setup";
import {
	addClipResult,
	clearAllHistoryResult,
	deleteHistoryItemResult,
	getHistoryResult,
	toggleFavoriteResult,
} from "./db";

describe("db", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("addClipResult", () => {
		it("returns ok result when successful", async () => {
			const mockApi = getMockElectronAPI();

			const result = await addClipResult("test content");

			expect(result.ok).toBe(true);
			expect(mockApi.db.addClip).toHaveBeenCalledWith("test content");
		});

		it("returns error result when API call fails", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.addClip.mockRejectedValue(new Error("Add failed"));

			const result = await addClipResult("test content");

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe("QUERY_FAILED");
				expect(result.error.message).toBe("Failed to add clip");
			}
			expect.assertions(3);
		});
	});

	describe("getHistoryResult", () => {
		it("returns ok result with items when successful", async () => {
			const mockApi = getMockElectronAPI();
			const mockItems = createMockHistoryItems(3);
			mockApi.db.getHistory.mockResolvedValue(mockItems);

			const result = await getHistoryResult();

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toEqual(mockItems);
			}
			expect(mockApi.db.getHistory).toHaveBeenCalledWith({});
			expect.assertions(3);
		});

		it("passes query parameter correctly", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.getHistory.mockResolvedValue([]);

			await getHistoryResult({ query: "search term" });

			expect(mockApi.db.getHistory).toHaveBeenCalledWith({
				query: "search term",
			});
		});

		it("passes limit parameter correctly", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.getHistory.mockResolvedValue([]);

			await getHistoryResult({ limit: 100 });

			expect(mockApi.db.getHistory).toHaveBeenCalledWith({ limit: 100 });
		});

		it("passes favoritesOnly parameter correctly", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.getHistory.mockResolvedValue([]);

			await getHistoryResult({ favoritesOnly: true });

			expect(mockApi.db.getHistory).toHaveBeenCalledWith({
				favoritesOnly: true,
			});
		});

		it("passes offset parameter correctly", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.getHistory.mockResolvedValue([]);

			await getHistoryResult({ offset: 50 });

			expect(mockApi.db.getHistory).toHaveBeenCalledWith({ offset: 50 });
		});

		it("passes all parameters correctly", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.getHistory.mockResolvedValue([]);

			await getHistoryResult({
				query: "test",
				limit: 25,
				favoritesOnly: true,
				offset: 100,
			});

			expect(mockApi.db.getHistory).toHaveBeenCalledWith({
				query: "test",
				limit: 25,
				favoritesOnly: true,
				offset: 100,
			});
		});

		it("returns error result when API call fails", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.getHistory.mockRejectedValue(new Error("Query failed"));

			const result = await getHistoryResult();

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe("QUERY_FAILED");
				expect(result.error.message).toBe("Failed to get history");
			}
			expect.assertions(3);
		});
	});

	describe("deleteHistoryItemResult", () => {
		it("returns ok result when successful", async () => {
			const mockApi = getMockElectronAPI();

			const result = await deleteHistoryItemResult(123);

			expect(result.ok).toBe(true);
			expect(mockApi.db.deleteHistoryItem).toHaveBeenCalledWith(123);
		});

		it("returns error result when API call fails", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.deleteHistoryItem.mockRejectedValue(
				new Error("Delete failed"),
			);

			const result = await deleteHistoryItemResult(123);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe("QUERY_FAILED");
				expect(result.error.message).toBe("Failed to delete history item");
			}
			expect.assertions(3);
		});
	});

	describe("clearAllHistoryResult", () => {
		it("returns ok result when successful", async () => {
			const mockApi = getMockElectronAPI();

			const result = await clearAllHistoryResult();

			expect(result.ok).toBe(true);
			expect(mockApi.db.clearAllHistory).toHaveBeenCalled();
		});

		it("returns error result when API call fails", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.clearAllHistory.mockRejectedValue(new Error("Clear failed"));

			const result = await clearAllHistoryResult();

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe("QUERY_FAILED");
				expect(result.error.message).toBe("Failed to clear all history");
			}
			expect.assertions(3);
		});
	});

	describe("toggleFavoriteResult", () => {
		it("returns ok result with true when favoriting", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.toggleFavorite.mockResolvedValue(true);

			const result = await toggleFavoriteResult(123);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(true);
			}
			expect(mockApi.db.toggleFavorite).toHaveBeenCalledWith(123);
			expect.assertions(3);
		});

		it("returns ok result with false when unfavoriting", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.toggleFavorite.mockResolvedValue(false);

			const result = await toggleFavoriteResult(123);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(false);
			}
			expect.assertions(2);
		});

		it("returns error result when API call fails", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.toggleFavorite.mockRejectedValue(new Error("Toggle failed"));

			const result = await toggleFavoriteResult(123);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.type).toBe("QUERY_FAILED");
				expect(result.error.message).toBe("Failed to toggle favorite");
			}
			expect.assertions(3);
		});
	});
});
