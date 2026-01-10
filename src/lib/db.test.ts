import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockHistoryItems } from "../test/mocks/history";
import { getMockElectronAPI } from "../test/setup";
import {
	addClip,
	clearAllHistory,
	deleteHistoryItem,
	getHistory,
	toggleFavorite,
} from "./db";

describe("db", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("addClip", () => {
		it("calls electronAPI.db.addClip with text", async () => {
			const mockApi = getMockElectronAPI();

			await addClip("test content");

			expect(mockApi.db.addClip).toHaveBeenCalledWith("test content");
		});
	});

	describe("getHistory", () => {
		it("calls electronAPI.db.getHistory with default options", async () => {
			const mockApi = getMockElectronAPI();
			const mockItems = createMockHistoryItems(3);
			mockApi.db.getHistory.mockResolvedValue(mockItems);

			const result = await getHistory();

			expect(mockApi.db.getHistory).toHaveBeenCalledWith({});
			expect(result).toEqual(mockItems);
		});

		it("passes query parameter correctly", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.getHistory.mockResolvedValue([]);

			await getHistory({ query: "search term" });

			expect(mockApi.db.getHistory).toHaveBeenCalledWith({
				query: "search term",
			});
		});

		it("passes limit parameter correctly", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.getHistory.mockResolvedValue([]);

			await getHistory({ limit: 100 });

			expect(mockApi.db.getHistory).toHaveBeenCalledWith({ limit: 100 });
		});

		it("passes favoritesOnly parameter correctly", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.getHistory.mockResolvedValue([]);

			await getHistory({ favoritesOnly: true });

			expect(mockApi.db.getHistory).toHaveBeenCalledWith({ favoritesOnly: true });
		});

		it("passes offset parameter correctly", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.getHistory.mockResolvedValue([]);

			await getHistory({ offset: 50 });

			expect(mockApi.db.getHistory).toHaveBeenCalledWith({ offset: 50 });
		});

		it("passes all parameters correctly", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.getHistory.mockResolvedValue([]);

			await getHistory({
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
	});

	describe("deleteHistoryItem", () => {
		it("calls electronAPI.db.deleteHistoryItem with id", async () => {
			const mockApi = getMockElectronAPI();

			await deleteHistoryItem(123);

			expect(mockApi.db.deleteHistoryItem).toHaveBeenCalledWith(123);
		});
	});

	describe("clearAllHistory", () => {
		it("calls electronAPI.db.clearAllHistory", async () => {
			const mockApi = getMockElectronAPI();

			await clearAllHistory();

			expect(mockApi.db.clearAllHistory).toHaveBeenCalled();
		});
	});

	describe("toggleFavorite", () => {
		it("calls electronAPI.db.toggleFavorite with id", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.toggleFavorite.mockResolvedValue(true);

			const result = await toggleFavorite(123);

			expect(mockApi.db.toggleFavorite).toHaveBeenCalledWith(123);
			expect(result).toBe(true);
		});

		it("returns false when unfavoriting", async () => {
			const mockApi = getMockElectronAPI();
			mockApi.db.toggleFavorite.mockResolvedValue(false);

			const result = await toggleFavorite(123);

			expect(result).toBe(false);
		});
	});
});
