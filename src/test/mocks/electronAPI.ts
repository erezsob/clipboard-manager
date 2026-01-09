import type { Mock } from "vitest";
import { vi } from "vitest";

/**
 * Mock implementation of the ElectronAPI interface
 * All methods are vi.fn() mocks with sensible default return values
 */
export interface MockElectronAPI {
	clipboard: {
		readText: Mock<() => Promise<string>>;
		writeText: Mock<(text: string) => Promise<void>>;
	};
	db: {
		getHistory: Mock<
			(
				query?: string,
				limit?: number,
				favoritesOnly?: boolean,
				offset?: number,
			) => Promise<
				Array<{
					id: number;
					content: string;
					type: string;
					created_at: string;
					is_favorite: number;
				}>
			>
		>;
		addClip: Mock<(text: string) => Promise<void>>;
		deleteHistoryItem: Mock<(id: number) => Promise<void>>;
		clearAllHistory: Mock<() => Promise<void>>;
		toggleFavorite: Mock<(id: number) => Promise<boolean>>;
	};
	window: {
		center: Mock<() => Promise<void>>;
		show: Mock<() => Promise<void>>;
		hide: Mock<() => Promise<void>>;
		isVisible: Mock<() => Promise<boolean>>;
	};
	app: {
		quit: Mock<() => Promise<void>>;
	};
}

/**
 * Creates a fresh mock ElectronAPI object with sensible defaults
 * @returns A fully mocked ElectronAPI matching the interface from electron/preload.ts
 */
export function createMockElectronAPI(): MockElectronAPI {
	return {
		clipboard: {
			readText: vi.fn().mockResolvedValue(""),
			writeText: vi.fn().mockResolvedValue(undefined),
		},
		db: {
			getHistory: vi.fn().mockResolvedValue([]),
			addClip: vi.fn().mockResolvedValue(undefined),
			deleteHistoryItem: vi.fn().mockResolvedValue(undefined),
			clearAllHistory: vi.fn().mockResolvedValue(undefined),
			toggleFavorite: vi.fn().mockResolvedValue(true),
		},
		window: {
			center: vi.fn().mockResolvedValue(undefined),
			show: vi.fn().mockResolvedValue(undefined),
			hide: vi.fn().mockResolvedValue(undefined),
			isVisible: vi.fn().mockResolvedValue(false),
		},
		app: {
			quit: vi.fn().mockResolvedValue(undefined),
		},
	};
}

/**
 * Creates a mock history item for testing
 * @param overrides - Properties to override on the default item
 * @returns A history item object
 */
export function createMockHistoryItem(
	overrides: Partial<{
		id: number;
		content: string;
		type: string;
		created_at: string;
		is_favorite: number;
	}> = {},
) {
	return {
		id: 1,
		content: "Test clipboard content",
		type: "text",
		created_at: new Date().toISOString(),
		is_favorite: 0,
		...overrides,
	};
}

/**
 * Creates multiple mock history items for testing
 * @param count - Number of items to create
 * @param baseOverrides - Properties to apply to all items
 * @returns Array of history items
 */
export function createMockHistoryItems(
	count: number,
	baseOverrides: Partial<{
		type: string;
		is_favorite: number;
	}> = {},
) {
	return Array.from({ length: count }, (_, index) =>
		createMockHistoryItem({
			id: index + 1,
			content: `Test content ${index + 1}`,
			created_at: new Date(Date.now() - index * 60000).toISOString(),
			...baseOverrides,
		}),
	);
}
